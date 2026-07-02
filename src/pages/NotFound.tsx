import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import logoColor from "@/assets/logo-color.svg";

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Helmet>
        <title>Page Not Found | MIMS</title>
      </Helmet>
      <div className="text-center flex flex-col items-center px-6">
        <img
          src={logoColor}
          alt="Minerva Investment Management Society"
          className="h-32 w-32 sm:h-40 sm:w-40 mb-8"
        />
        <h1 className="font-serif text-hero text-accent mb-4">404</h1>
        <p className="font-body text-body-lg text-muted-foreground mb-8 max-w-md">
          The page you are looking for does not exist.
        </p>
        <Link to="/" className="cta-link">
          Return to Homepage
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
