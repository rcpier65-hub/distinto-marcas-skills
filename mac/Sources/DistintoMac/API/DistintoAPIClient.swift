import Foundation

/// Thin client for Distinto cloud API (Vercel).
actor DistintoAPIClient {
    private let urlSession: URLSession
    private let decoder: JSONDecoder

    init(urlSession: URLSession = .shared) {
        self.urlSession = urlSession
        self.decoder = JSONDecoder()
    }

    /// GET /api/v1/tareas?due=hoy[&include_overdue=1]
    /// `accessToken` es una clave de dispositivo `dst_live_…` o un access token de Supabase.
    /// El cliente no envía el secreto de cron del servidor.
    func fetchTareasHoy(
        accessToken: String,
        includeOverdue: Bool = true,
        teamMemberId: String? = nil
    ) async throws -> TareasHoyResponse {
        var comps = URLComponents(
            url: AppConfig.apiBaseURL.appendingPathComponent("api/v1/tareas"),
            resolvingAgainstBaseURL: false
        )!
        var items = [
            URLQueryItem(name: "due", value: "hoy")
        ]
        if includeOverdue {
            items.append(URLQueryItem(name: "include_overdue", value: "1"))
        }
        if let teamMemberId {
            items.append(URLQueryItem(name: "team_member_id", value: teamMemberId))
        }
        comps.queryItems = items

        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, resp) = try await urlSession.data(for: req)
        guard let http = resp as? HTTPURLResponse else {
            throw APIError.http(-1, "Sin respuesta")
        }
        if http.statusCode == 401 {
            throw APIError.unauthorized
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(http.statusCode, Self.serverMessage(from: data))
        }
        do {
            return try decoder.decode(TareasHoyResponse.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }

    private static func serverMessage(from data: Data) -> String {
        if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let error = obj["error"] as? String, !error.isEmpty { return error }
            if let message = obj["message"] as? String, !message.isEmpty { return message }
        }
        let raw = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if raw.isEmpty { return "Error del servidor" }
        if raw.count > 180 { return String(raw.prefix(180)) + "…" }
        return raw
    }
}
