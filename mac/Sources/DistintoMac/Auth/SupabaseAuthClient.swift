import Foundation

/// Minimal Supabase Auth client (email/password), matching web `signInWithPassword`.
actor SupabaseAuthClient {
    private let urlSession: URLSession
    private let decoder: JSONDecoder

    private enum Accounts {
        static let access = "supabase.access_token"
        static let refresh = "supabase.refresh_token"
        static let email = "supabase.email"
        static let userId = "supabase.user_id"
        static let expires = "supabase.expires_at"
    }

    init(urlSession: URLSession = .shared) {
        self.urlSession = urlSession
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder = d
    }

    func signIn(email: String, password: String) async throws -> AuthSession {
        let endpoint = AppConfig.supabaseURL.appendingPathComponent("auth/v1/token")
        var comps = URLComponents(url: endpoint, resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "grant_type", value: "password")]

        var req = URLRequest(url: comps.url!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        let body: [String: String] = [
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            "password": password
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, resp) = try await urlSession.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw AuthError.server("Sin respuesta") }
        if http.statusCode == 400 || http.statusCode == 401 {
            throw AuthError.invalidCredentials
        }
        guard (200..<300).contains(http.statusCode) else {
            throw AuthError.server(Self.errorMessage(from: data) ?? "Error \(http.statusCode)")
        }

        let token = try decoder.decode(SupabaseTokenResponse.self, from: data)
        guard let access = token.accessToken, let refresh = token.refreshToken, let user = token.user else {
            throw AuthError.decoding
        }
        let session = AuthSession(
            accessToken: access,
            refreshToken: refresh,
            expiresAt: token.expiresIn.map { Date().addingTimeInterval(TimeInterval($0)) },
            email: user.email ?? email,
            userId: user.id
        )
        try persist(session)
        return session
    }

    func restoreSession() async throws -> AuthSession? {
        guard
            let access = KeychainStore.get(account: Accounts.access),
            let refresh = KeychainStore.get(account: Accounts.refresh),
            let email = KeychainStore.get(account: Accounts.email),
            let userId = KeychainStore.get(account: Accounts.userId)
        else { return nil }

        var expires: Date?
        if let raw = KeychainStore.get(account: Accounts.expires), let t = Double(raw) {
            expires = Date(timeIntervalSince1970: t)
        }

        if let expires, expires.timeIntervalSinceNow < 60 {
            return try await refreshSession(refreshToken: refresh, email: email, userId: userId)
        }
        return AuthSession(
            accessToken: access,
            refreshToken: refresh,
            expiresAt: expires,
            email: email,
            userId: userId
        )
    }

    func refreshSession(refreshToken: String, email: String, userId: String) async throws -> AuthSession {
        let endpoint = AppConfig.supabaseURL.appendingPathComponent("auth/v1/token")
        var comps = URLComponents(url: endpoint, resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "grant_type", value: "refresh_token")]

        var req = URLRequest(url: comps.url!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": refreshToken])

        let (data, resp) = try await urlSession.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            clearPersisted()
            throw AuthError.notSignedIn
        }
        let token = try decoder.decode(SupabaseTokenResponse.self, from: data)
        guard let access = token.accessToken, let refresh = token.refreshToken else {
            throw AuthError.decoding
        }
        let session = AuthSession(
            accessToken: access,
            refreshToken: refresh,
            expiresAt: token.expiresIn.map { Date().addingTimeInterval(TimeInterval($0)) },
            email: token.user?.email ?? email,
            userId: token.user?.id ?? userId
        )
        try persist(session)
        return session
    }

    func signOut() {
        clearPersisted()
    }

    private func persist(_ session: AuthSession) throws {
        try KeychainStore.set(session.accessToken, account: Accounts.access)
        try KeychainStore.set(session.refreshToken, account: Accounts.refresh)
        try KeychainStore.set(session.email, account: Accounts.email)
        try KeychainStore.set(session.userId, account: Accounts.userId)
        if let exp = session.expiresAt {
            try KeychainStore.set(String(exp.timeIntervalSince1970), account: Accounts.expires)
        }
    }

    private func clearPersisted() {
        KeychainStore.delete(account: Accounts.access)
        KeychainStore.delete(account: Accounts.refresh)
        KeychainStore.delete(account: Accounts.email)
        KeychainStore.delete(account: Accounts.userId)
        KeychainStore.delete(account: Accounts.expires)
    }

    private static func errorMessage(from data: Data) -> String? {
        guard
            let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return String(data: data, encoding: .utf8) }
        return (obj["error_description"] as? String)
            ?? (obj["msg"] as? String)
            ?? (obj["message"] as? String)
            ?? (obj["error"] as? String)
    }
}

private struct SupabaseTokenResponse: Decodable {
    let accessToken: String?
    let refreshToken: String?
    let expiresIn: Int?
    let user: SupabaseUser?
}

private struct SupabaseUser: Decodable {
    let id: String
    let email: String?
}
