import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import fullLogoAsset from "@/assets/mims-full-logo-color.png.asset.json";

const NotFound = () => {
  return (
    // =================================================================
    // THE PAGE FILLS THE SCREEN BELOW THE HEADER.
    //
    // It was `min-h-[60vh]`, which on a laptop is about 540px: the logo,
    // the numeral, four lines of copy and a button were pressed into that
    // band with no air around them, and the black footer arrived halfway
    // up the screen. 60% of the viewport is not a composition, it is a
    // leftover.
    //
    // `100svh` minus the 84px the header spacer occupies is exactly the
    // space this page actually has, so the footer sits at the fold rather
    // than above it, and the generous vertical padding gives the three
    // elements room to be a group instead of a stack. `svh` rather than
    // `vh` because on iOS `vh` is the LARGE viewport, which would push
    // the button under the browser's own toolbar.
    // =================================================================
    <div className="flex min-h-[calc(100svh-84px)] items-center justify-center py-20 sm:py-24">
      <Helmet>
        <title>Page Not Found | MIMS</title>
      </Helmet>
      <div className="text-center flex flex-col items-center px-6">
        <img
          src={fullLogoAsset.url}
          alt="Minerva Investment Management Society"
          className="h-32 w-32 sm:h-40 sm:w-40 mb-8"
        />
        <h1 className="font-serif text-hero text-accent mb-4">404</h1>
        <p className="font-body text-body-lg text-muted-foreground mb-8 max-w-md">
          You&rsquo;ve just discovered a genuine Black Swan event. This page has vanished faster
          than market liquidity in 2008, but discovering rare anomalies is exactly what we thrive
          on. Let&rsquo;s redeploy that capital to the Home page.
        </p>
        <Link
          to="/"
          className="inline-block px-10 py-4 bg-accent text-background border border-accent font-serif text-lg transition-all duration-200 hover:bg-background hover:text-accent"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
