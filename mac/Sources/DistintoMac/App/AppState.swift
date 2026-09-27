import Foundation
import Combine

@MainActor
final class AppState: ObservableObject {
    enum Route: Hashable {
        case hoy
        case inicio
        case tareas
        case perfil
    }

    @Published var session: AuthSession?
    @Published var selectedRoute: Route = .hoy
    @Published var isBootstrapping = true

    let auth: SupabaseAuthClient
    let api: DistintoAPIClient

    init(
        auth: SupabaseAuthClient = SupabaseAuthClient(),
        api: DistintoAPIClient = DistintoAPIClient()
    ) {
        self.auth = auth
        self.api = api
        Task { await bootstrap() }
    }

    func bootstrap() async {
        isBootstrapping = true
        defer { isBootstrapping = false }
        if let restored = try? await auth.restoreSession() {
            session = restored
        }
    }

    func signIn(email: String, password: String) async throws {
        let s = try await auth.signIn(email: email, password: password)
        session = s
        selectedRoute = .hoy
    }

    func signOut() async {
        await auth.signOut()
        session = nil
        selectedRoute = .hoy
    }

    var accessToken: String? { session?.accessToken }
}
