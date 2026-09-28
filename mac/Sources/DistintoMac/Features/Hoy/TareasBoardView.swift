import SwiftUI

/// Tablero de /tareas: columnas por categoría, filtros y compositor.
struct TareasBoardView: View {
    @EnvironmentObject private var appState: AppState
    @State private var tablero: TareasTableroResponse?
    @State private var loading = false
    @State private var error: String?
    @State private var modo = "Tablero"
    @State private var estado = "Todas"
    @State private var marca = "Todas"
    @State private var persona = "Todas"
    @State private var borrador = ""
    @State private var assignee = ""
    @State private var creando = false
    @State private var aviso: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if tablero != nil {
                filtros
            }
            if let error, tablero != nil {
                TareasErrorBanner(message: error)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
            }
            if let aviso {
                Text(aviso)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(hex: 0x166534))
                    .padding(.horizontal, 24)
                    .padding(.bottom, 6)
            }
            content
            if modo != "Archivo" {
                composer
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(DistintoTokens.ColorToken.bgBase)
        .task { await load() }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 10) {
            Image(systemName: "sparkles")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(DistintoTokens.ColorToken.accent)
                .frame(width: 30, height: 30)
                .background(DistintoTokens.ColorToken.accentBg)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text("Tareas")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                Text(subtitle)
                    .font(.system(size: 11.5))
                    .foregroundStyle(Color(hex: 0x6B7280))
            }
            Spacer(minLength: 8)
            ViewModeBar(titles: ["Tablero", "Lista", "Archivo"], selection: modo) { modo = $0 }
            ModuleRefreshButton(loading: loading) { Task { await load(force: true) } }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
    }

    private var subtitle: String {
        guard let tablero else { return "Tu tablero" }
        let noun = tablero.total == 1 ? "abierta" : "abiertas"
        return tablero.esDueno ? "\(tablero.total) \(noun) · equipo" : "\(tablero.total) \(noun)"
    }

    private var filtros: some View {
        HStack(spacing: 8) {
            ForEach(["Todas", "Pendiente", "En proceso"], id: \.self) { item in
                let active = estado == item
                Button {
                    estado = item
                } label: {
                    Text(item)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(active ? .white : DistintoTokens.ColorToken.textSecondary)
                        .padding(.horizontal, 10)
                        .frame(height: 26)
                        .background(active ? DistintoTokens.ColorToken.ink : Color.white)
                        .overlay(
                            Capsule().stroke(active ? Color.clear : DistintoTokens.ColorToken.borderSubtle, lineWidth: 1)
                        )
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
            menuFiltro(titulo: marca == "Todas" ? "Marca" : marca, seleccion: marca) {
                Button("Todas") { marca = "Todas" }
                ForEach(tablero?.marcas ?? []) { item in
                    Button(item.nombre) { marca = item.nombre }
                }
            }
            if tablero?.esDueno == true {
                menuFiltro(titulo: persona == "Todas" ? "Persona" : persona, seleccion: persona) {
                    Button("Todas") { persona = "Todas" }
                    ForEach(tablero?.equipo ?? []) { item in
                        Button(item.nombre) { persona = item.nombre }
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 10)
    }

    private func menuFiltro<Content: View>(titulo: String, seleccion: String, @ViewBuilder content: () -> Content) -> some View {
        Menu {
            content()
        } label: {
            HStack(spacing: 4) {
                Text(titulo)
                    .lineLimit(1)
                Image(systemName: "chevron.down")
                    .font(.system(size: 9, weight: .bold))
            }
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(seleccion == "Todas" ? DistintoTokens.ColorToken.textSecondary : DistintoTokens.ColorToken.ink)
            .padding(.horizontal, 10)
            .frame(height: 26)
            .background(Color.white)
            .overlay(Capsule().stroke(DistintoTokens.ColorToken.borderSubtle, lineWidth: 1))
            .clipShape(Capsule())
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
    }

    @ViewBuilder
    private var content: some View {
        if tablero == nil {
            TareasPlaceholder(loading: loading, error: error)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if modo == "Archivo" {
            archivo
        } else if filtered.isEmpty {
            TareasEmptyState(
                title: "El tablero está vacío",
                message: "No hay tareas abiertas con estos filtros. Escribe una abajo."
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if modo == "Lista" {
            ScrollView {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(filtered) { tarea in
                        TareaTableroRow(tarea: tarea) { Task { await completar(tarea) } }
                    }
                }
                .padding(12)
                .distintoCard()
                .padding(.horizontal, 24)
                .padding(.bottom, 12)
            }
        } else {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 196, maximum: 240), spacing: 10, alignment: .top)], alignment: .leading, spacing: 12) {
                    ForEach(columns) { column in
                        TareaColumna(column: column) { tarea in
                            Task { await completar(tarea) }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 12)
            }
        }
    }

    private var archivo: some View {
        let items = tablero?.archivo ?? []
        return ScrollView {
            if items.isEmpty {
                TareasEmptyState(title: "Archivo vacío", message: "Las tareas que marques hechas quedan acá.")
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(items) { tarea in
                        HStack(spacing: 10) {
                            Circle()
                                .fill(Color(hexString: tarea.color) ?? DistintoTokens.ColorToken.accent)
                                .frame(width: 8, height: 8)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(tarea.titulo)
                                    .font(.system(size: 13))
                                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                                    .lineLimit(2)
                                Text(tarea.categoria)
                                    .font(.system(size: 11))
                                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                            }
                            Spacer(minLength: 8)
                            Button("Reabrir") { Task { await completar(tarea, hecha: false) } }
                                .buttonStyle(.plain)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(DistintoTokens.ColorToken.accent)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                    }
                }
                .padding(8)
                .distintoCard()
                .padding(.horizontal, 24)
                .padding(.bottom, 16)
            }
        }
    }

    private var composer: some View {
        HStack(spacing: 8) {
            TextField("Escribe una tarea… @Nombre", text: $borrador)
                .textFieldStyle(.plain)
                .font(.system(size: 13))
                .onSubmit { Task { await crear() } }
            if tablero?.esDueno == true, let equipo = tablero?.equipo, !equipo.isEmpty {
                Menu {
                    Button("Para mí") { assignee = "" }
                    ForEach(equipo) { item in
                        Button(item.nombre) { assignee = item.id }
                    }
                } label: {
                    Text(nombreAssignee)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(DistintoTokens.ColorToken.textSecondary)
                        .lineLimit(1)
                }
                .menuStyle(.borderlessButton)
                .frame(maxWidth: 140)
            }
            Button {
                Task { await crear() }
            } label: {
                Text(creando ? "Creando…" : "Agregar")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .frame(height: 30)
                    .background(DistintoTokens.ColorToken.ink)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(creando || borrador.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.white)
        .overlay(alignment: .top) {
            Rectangle().fill(DistintoTokens.ColorToken.borderSubtle).frame(height: 1)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 16)
    }

    private var nombreAssignee: String {
        guard !assignee.isEmpty else { return "Para mí" }
        return tablero?.equipo.first { $0.id == assignee }?.nombre ?? "Para mí"
    }

    private var filtered: [TareaTablero] {
        (tablero?.tareas ?? []).filter { tarea in
            let pasaEstado: Bool
            switch estado {
            case "Pendiente": pasaEstado = tarea.estado != "en_proceso"
            case "En proceso": pasaEstado = tarea.estado == "en_proceso"
            default: pasaEstado = true
            }
            let pasaMarca = marca == "Todas" || tarea.marca == marca || tarea.categoria == marca
            let pasaPersona = persona == "Todas" || tarea.asignado == persona
            return pasaEstado && pasaMarca && pasaPersona
        }
    }

    private var columns: [TableroColumna] {
        var order: [String] = []
        var grouped: [String: [TareaTablero]] = [:]
        for tarea in filtered {
            if grouped[tarea.categoria] == nil { order.append(tarea.categoria) }
            grouped[tarea.categoria, default: []].append(tarea)
        }
        return order.map { name in
            let items = grouped[name] ?? []
            return TableroColumna(id: name, name: name, color: items.first?.color ?? "#7170FF", items: items)
        }
    }

    private func completar(_ tarea: TareaTablero, hecha: Bool = true) async {
        guard let token = appState.accessToken else { return }
        do {
            try await appState.api.completarTarea(accessToken: token, id: tarea.id, completada: hecha)
            aviso = hecha ? "Tarea marcada hecha." : "Tarea reabierta."
            await load(force: true)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func crear() async {
        let texto = borrador.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !texto.isEmpty, !creando, let token = appState.accessToken else { return }
        creando = true
        defer { creando = false }
        do {
            _ = try await appState.api.crearTarea(accessToken: token, texto: texto, assigneeId: assignee.isEmpty ? nil : assignee)
            borrador = ""
            aviso = "Tarea creada."
            await load(force: true)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func load(force: Bool = false) async {
        await ModuleLoad.fetch(
            appState: appState,
            loading: $loading,
            error: $error,
            loaded: tablero != nil,
            force: force
        ) { token in
            tablero = try await appState.api.fetchTareasTablero(accessToken: token)
        }
    }
}

private struct TableroColumna: Identifiable {
    let id: String
    let name: String
    let color: String
    let items: [TareaTablero]
}

private struct TareaColumna: View {
    let column: TableroColumna
    let onDone: (TareaTablero) -> Void

    private var tint: Color { Color(hexString: column.color) ?? DistintoTokens.ColorToken.accent }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Circle().fill(tint).frame(width: 7, height: 7)
                Text(column.name)
                    .font(.system(size: 11.5, weight: .bold))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .lineLimit(1)
                Spacer(minLength: 4)
                Text("\(column.items.count)")
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x9CA3AF))
            }
            .padding(.leading, 7)
            .overlay(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2).fill(tint).frame(width: 3)
            }
            ForEach(column.items) { tarea in
                TareaColorCard(tarea: tarea, tint: tint) { onDone(tarea) }
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
    }
}

private struct TareaColorCard: View {
    let tarea: TareaTablero
    let tint: Color
    let onDone: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(tarea.titulo)
                .font(.system(size: 12))
                .foregroundStyle(.white)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 6) {
                Text(tarea.estadoLabel)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white.opacity(0.92))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.white.opacity(0.18))
                    .clipShape(Capsule())
                if let fecha = tarea.fechaEntrega {
                    Text(LimaFormat.shortDate(fecha))
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.9))
                }
                Spacer(minLength: 0)
                Button(action: onDone) {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(tint)
                        .frame(width: 18, height: 18)
                        .background(Color.white)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .help("Marcar hecha")
            }
        }
        .padding(10)
        .background(tint)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

private struct TareaTableroRow: View {
    let tarea: TareaTablero
    let onDone: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(Color(hexString: tarea.color) ?? DistintoTokens.ColorToken.accent)
                .frame(width: 8, height: 8)
            VStack(alignment: .leading, spacing: 2) {
                Text(tarea.titulo)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(DistintoTokens.ColorToken.ink)
                    .lineLimit(2)
                Text([tarea.categoria, tarea.asignado, tarea.fechaEntrega.map { LimaFormat.shortDate($0) }]
                    .compactMap { $0 }
                    .filter { !$0.isEmpty }
                    .joined(separator: " · "))
                    .font(.system(size: 11))
                    .foregroundStyle(DistintoTokens.ColorToken.textTertiary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            StatusChip(label: tarea.estadoLabel, color: DistintoTokens.ColorToken.textSecondary)
            Button(action: onDone) {
                Image(systemName: "checkmark.circle")
                    .foregroundStyle(DistintoTokens.ColorToken.success)
            }
            .buttonStyle(.plain)
            .help("Marcar hecha")
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
    }
}
