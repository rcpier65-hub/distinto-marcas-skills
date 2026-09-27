import Foundation

struct IdeasResponse: Codable, Equatable {
    let ok: Bool
    let total: Int
    let nichos: [String]
    let ideas: [IdeaBancoItem]
}

struct IdeaBancoItem: Codable, Equatable, Identifiable {
    let id: String
    let nicho: String
    let idea: String
    let gancho: String
    let link: String
}
