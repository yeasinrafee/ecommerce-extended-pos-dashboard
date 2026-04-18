
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

const SearchBar = ({
  searchInput,
  setSearchInput,
  clearSearch,
}: {
  searchInput: string;
  setSearchInput: (value: string) => void;
  searchTerm?: string;
  clearSearch: () => void;
}) => {
  return (
    <div className="relative flex items-center w-full max-w-sm bg-background">
      <div className="absolute left-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <Input
        type="text"
        placeholder="Search..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="h-10 pl-10 pr-10 shadow-none focus-visible:ring-1 focus-visible:ring-gray-400"
      />
      {searchInput && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;