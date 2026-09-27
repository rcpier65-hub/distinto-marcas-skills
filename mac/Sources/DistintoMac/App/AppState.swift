import Foundation
import Combine

@MainActor
final class AppState: ObservableObject {
    @Published var session: AuthSession?
    @Published var selectedRoute: AppRoute = .inicio
    @Published var isBootstrapping = true
    @Published var showPalette = false

    @Published private(set) var tareasHoy: TareasHoyResponse?
    @Published private(set) var tareasError: String?
    @Published private(set) var tareasLoading = false

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
        let next = try await auth.signIn(email: email, password: password)
        session = next
        selectedRoute = .inicio
        tareasHoy = nil
        tareasError = nil
    }

    func signOut() async {
        await auth.signOut()
        session = nil
        selectedRoute = .inicio
        showPalette = false
        tareasHoy = nil
        tareasError = nil
        tareasLoading = false
    }

    func select(_ route: AppRoute) {
        selectedRoute = route
        showPalette = false
    }

    func reloadTareas() async {
        guard !tareasLoading else { return }
        guard let token = accessToken else {
            tareasError = APIError.notSignedIn.localizedDescription
            return
        }
        tareasLoading = true
        tareasError = nil
        defer { tareasLoading = false }
        do {
            let response = try await api.fetchTareasHoy(accessToken: token, includeOverdue: true)
            guard accessToken == token else { return }
            tareasHoy = response
        } catch {
            guard accessToken == token else { return }
            tareasError = error.localizedDescription
        }
    }

    var accessToken: String? { session?.accessToken }

    var shellItems: [ShellItem] {
        ShellCatalog.items(isPedro: session?.isPedro == true)
    }
}
