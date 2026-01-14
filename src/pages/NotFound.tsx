import { Link } from "react-router-dom";
import dashboardRestrictedLogo from '@/assets/dashboard-restricted-logo.png';

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center flex flex-col items-center">
        <img 
          src={dashboardRestrictedLogo} 
          alt="Minerva Investment Management Society" 
          className="h-48 w-48 mb-8"
        />
        <h1 className="font-serif text-hero text-primary mb-4">404</h1>
        <p className="font-body text-body-lg text-muted-foreground mb-8">
          The page you are looking for does not exist.
        </p>
        <Link 
          to="/" 
          className="inline-block bg-primary text-primary-foreground px-6 py-3 hover:opacity-90 transition-opacity uppercase"
          style={{ fontFamily: '"Times New Roman", Times, serif', fontVariant: 'small-caps' }}
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
