export function Search({ searchTerm, setSearchTerm, placeholder }: { searchTerm: any, setSearchTerm: any, placeholder: string }) {
    return <input
        className="search-field"
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
    />
}
