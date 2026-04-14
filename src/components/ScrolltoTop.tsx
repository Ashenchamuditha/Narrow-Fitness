import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // We use a tiny timeout to ensure the page has finished 
    // rendering before we scroll to the top
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant", // Use "smooth" if you want a sliding effect
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}