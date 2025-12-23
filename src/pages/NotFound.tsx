import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-hero text-primary mb-4">404</h1>
        <p className="font-body text-body-lg text-muted-foreground mb-8">
          The page you are looking for does not exist.
        </p>
        <Link 
          to="/" 
          className="inline-block bg-primary text-primary-foreground font-body text-body px-6 py-3 hover:opacity-90 transition-opacity"
        >
          Return to homepage
        </Link>
      </div>
    </div>
  );
};

export default NotFound;