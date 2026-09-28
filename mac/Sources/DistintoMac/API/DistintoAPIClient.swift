import Foundation

/// Thin client for Distinto cloud API (Vercel).
actor DistintoAPIClient {
    private let urlSession: URLSession
    private let decoder: JSONDecoder

    init(urlSession: URLSession = .shared) {
        self.urlSession = urlSession
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder = decoder
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

        let req = URLRequest(url: comps.url!)
        return try await send(req, accessToken: accessToken)
    }

    /// GET /api/v1/perfil — nombre, email y rol de la sesión.
    func fetchPerfil(accessToken: String) async throws -> PerfilResponse {
        try await get("api/v1/perfil", accessToken: accessToken)
    }

    /// GET /api/v1/soporte — reportes propios, o del equipo si es director.
    func fetchSoporte(accessToken: String) async throws -> SoporteResponse {
        try await get("api/v1/soporte", accessToken: accessToken)
    }

    /// GET /api/v1/publicaciones — próximas y recientes, solo lectura.
    func fetchPublicaciones(accessToken: String) async throws -> PublicacionesResponse {
        try await get("api/v1/publicaciones", accessToken: accessToken)
    }

    /// GET /api/v1/reportes — marcas con el último mes. Sesión, no clave de dispositivo.
    func fetchReportes(accessToken: String) async throws -> ReportesResponse {
        try await get("api/v1/reportes", accessToken: accessToken)
    }

    /// GET /api/v1/notas-reuniones — próximas y notas recientes.
    func fetchNotas(accessToken: String) async throws -> NotasResponse {
        try await get("api/v1/notas-reuniones", accessToken: accessToken)
    }

    /// GET /api/v1/oficina — escritorios, salas y atajos.
    func fetchOficina(accessToken: String) async throws -> OficinaResponse {
        try await get("api/v1/oficina", accessToken: accessToken)
    }

    /// GET /api/v1/creacion-de-ideas — banco compartido.
    func fetchIdeas(accessToken: String) async throws -> IdeasResponse {
        try await get("api/v1/creacion-de-ideas", accessToken: accessToken)
    }

    func fetchEditor(accessToken: String) async throws -> EditorResponse {
        try await get("api/v1/editor", accessToken: accessToken)
    }

    func fetchDiseno(accessToken: String) async throws -> DisenoResponse {
        try await get("api/v1/diseno", accessToken: accessToken)
    }

    func fetchHistorias(accessToken: String) async throws -> HistoriasResponse {
        try await get("api/v1/historias", accessToken: accessToken)
    }

    func fetchInfluencers(accessToken: String, marca: String?) async throws -> InfluencersResponse {
        var query: [URLQueryItem] = []
        if let marca, !marca.isEmpty {
            query.append(URLQueryItem(name: "marca", value: marca))
        }
        return try await get("api/v1/influencers", query: query, accessToken: accessToken)
    }

    func fetchPlanes(accessToken: String) async throws -> PlanesResponse {
        try await get("api/v1/planes", accessToken: accessToken)
    }

    func fetchDashboard(accessToken: String) async throws -> DashboardResponse {
        try await get("api/v1/dashboard", accessToken: accessToken)
    }

    func fetchGrilla(accessToken: String, slug: String, vista: String) async throws -> GrillaResponse {
        let encoded = slug.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? slug
        return try await get(
            "api/v1/grilla/\(encoded)",
            query: [URLQueryItem(name: "vista", value: vista)],
            accessToken: accessToken
        )
    }

    func fetchHabitos(accessToken: String) async throws -> HabitosResponse {
        try await get("api/v1/habitos", accessToken: accessToken)
    }

    func fetchActividad(accessToken: String, fecha: String?) async throws -> ActividadResponse {
        var query: [URLQueryItem] = []
        if let fecha { query.append(URLQueryItem(name: "fecha", value: fecha)) }
        return try await get("api/v1/actividad", query: query, accessToken: accessToken)
    }

    func fetchHistorial(accessToken: String) async throws -> HistorialResponse {
        try await get("api/v1/historial", accessToken: accessToken)
    }

    func fetchEquipo(accessToken: String) async throws -> EquipoResponse {
        try await get("api/v1/equipo", accessToken: accessToken)
    }

    func fetchSettings(accessToken: String) async throws -> SettingsResponse {
        try await get("api/v1/settings", accessToken: accessToken)
    }

    /// POST /api/v1/habitos { id } — marca o desmarca el hábito de hoy.
    func toggleHabito(accessToken: String, id: String) async throws -> HabitoToggleResponse {
        try await post("api/v1/habitos", body: ["id": id], accessToken: accessToken)
    }

    /// POST /api/v1/tareas { id, completada } — misma marca de hecha que /tareas.
    func completarTarea(accessToken: String, id: String, completada: Bool = true) async throws {
        let _: TareaCompletarResponse = try await post(
            "api/v1/tareas",
            body: ["id": id, "completada": completada],
            accessToken: accessToken
        )
    }

    /// POST /api/v1/soporte — misma alta que el formulario de /soporte, sin capturas.
    func crearReporte(accessToken: String, tipo: String, descripcion: String) async throws {
        let _: OkFlag = try await post(
            "api/v1/soporte",
            body: ["tipo": tipo, "descripcion": descripcion],
            accessToken: accessToken
        )
    }

    /// POST /api/v1/grabaciones/calendario — agendar reunión o grabación (director).
    func agendar(
        accessToken: String,
        tipo: String,
        marcaSlug: String,
        fecha: String,
        hora: String,
        durationMin: Int,
        titulo: String
    ) async throws -> AgendaCreadaResponse {
        try await post(
            "api/v1/grabaciones/calendario",
            body: [
                "tipo": tipo,
                "marca_slug": marcaSlug,
                "fecha": fecha,
                "hora": hora,
                "duration_min": durationMin,
                "titulo": titulo
            ],
            accessToken: accessToken
        )
    }

    /// GET /api/v1/grabaciones/calendario?desde&hasta — grabaciones y reuniones.
    func fetchCalendario(accessToken: String, desde: String, hasta: String) async throws -> CalendarioResponse {
        try await get(
            "api/v1/grabaciones/calendario",
            query: [
                URLQueryItem(name: "desde", value: desde),
                URLQueryItem(name: "hasta", value: hasta)
            ],
            accessToken: accessToken
        )
    }

    private func get<T: Decodable>(
        _ path: String,
        query: [URLQueryItem] = [],
        accessToken: String
    ) async throws -> T {
        var comps = URLComponents(url: AppConfig.apiBaseURL, resolvingAgainstBaseURL: false)!
        comps.path = path.hasPrefix("/") ? path : "/" + path
        if !query.isEmpty { comps.queryItems = query }
        guard let url = comps.url else { throw APIError.http(-1, "URL inválida") }
        let req = URLRequest(url: url)
        return try await send(req, accessToken: accessToken)
    }

    private func post<T: Decodable>(
        _ path: String,
        body: [String: Any],
        accessToken: String
    ) async throws -> T {
        var comps = URLComponents(url: AppConfig.apiBaseURL, resolvingAgainstBaseURL: false)!
        comps.path = path.hasPrefix("/") ? path : "/" + path
        guard let url = comps.url else { throw APIError.http(-1, "URL inválida") }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await send(req, accessToken: accessToken, method: "POST")
    }

    private func send<T: Decodable>(_ request: URLRequest, accessToken: String, method: String = "GET") async throws -> T {
        var req = request
        if req.httpMethod == nil || method == "GET" {
            req.httpMethod = method
        }
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
            return try decoder.decode(T.self, from: data)
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

struct OkFlag: Codable, Equatable {
    let ok: Bool
}

struct AgendaCreadaResponse: Codable, Equatable {
    let ok: Bool
    let tipo: String
    let id: String?
    let meetLink: String?
    let gcalSynced: Bool?
}
