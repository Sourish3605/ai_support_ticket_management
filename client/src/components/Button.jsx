const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const base = 'rounded-2xl px-4 py-2.5 font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
