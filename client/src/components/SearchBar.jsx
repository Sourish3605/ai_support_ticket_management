import { FiSearch } from 'react-icons/fi';

const SearchBar = ({ value, onChange, placeholder = 'Search' }) => {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
      <FiSearch size={16} />
      <input value={value} onChange={onChange} className="w-full border-none bg-transparent outline-none" placeholder={placeholder} />
    </label>
  );
};

export default SearchBar;
