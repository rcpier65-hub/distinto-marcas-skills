import Foundation

/// Public configuration for Distinto macOS (Phase 1).
/// Mirrors web `NEXT_PUBLIC_SUPABASE_*` + live API host.
enum AppConfig {
    static let apiBaseURL = URL(string: "https://distinto-app.vercel.app")!
    static let supabaseURL = URL(string: "https://exhmimlehdisonjvedvx.supabase.co")!
    /// Legacy anon JWT (publishable). Prefer injecting via Secrets.xcconfig in later phases.
    static let supabaseAnonKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4aG1pbWxlaGRpc29uanZlZHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTAxODQsImV4cCI6MjA5NDcyNjE4NH0.Q8JyWFxVKLM_Z6aiGZ-GuCHaOLvhh-aSI49N5tv0Cp8"
    static let timeZone = TimeZone(identifier: "America/Lima")!
    static let pedroEmail = "pedro@agenciadistinto.com"

    static func webURL(_ path: String) -> URL {
        let base = apiBaseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let suffix = path.hasPrefix("/") ? path : "/" + path
        return URL(string: base + suffix) ?? apiBaseURL
    }
}
