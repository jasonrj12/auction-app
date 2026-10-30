import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-sm">
        <div className="text-7xl font-black text-indigo-200 mb-2">404</div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          The auction, listing, or page you are looking for has been moved or doesn't exist.
        </p>
        <Link to="/">
          <Button size="lg">Return to Auctions</Button>
        </Link>
      </div>
    </div>
  );
}
