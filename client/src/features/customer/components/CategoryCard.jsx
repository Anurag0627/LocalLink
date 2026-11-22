import { ArrowRight, Grid2X2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CategoryCard({ category }) {
  return (
    <Link
      to={`/categories/${category.slug || category._id}`}
      className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {category.image ? <img src={category.image} alt="" className="h-full w-full rounded-xl object-cover" /> : <Grid2X2 size={22} />}
      </span>
      <span className="flex-1">
        <span className="block font-bold text-slate-900">{category.name}</span>
        <span className="mt-1 block text-sm text-slate-500">
          {category.description || `${category.serviceCount ?? 0} available services`}
        </span>
      </span>
      <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-600" />
    </Link>
  );
}
