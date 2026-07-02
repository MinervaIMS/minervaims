import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import logoFullColor from "@/assets/logo-full-color.png";

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Helmet>
        <title>Page Not Found | MIMS</title>
      </Helmet>
      <div className="text-center flex flex-col items-center px-6">
        <img
          src={logoFullColor}
          alt="Minerva Investment Management Society"
          className="h-44 w-auto sm:h-52 mb-8"
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
