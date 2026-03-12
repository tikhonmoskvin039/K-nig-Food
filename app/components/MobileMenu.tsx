"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import MiniCart from "./MiniCart";
import { ReduxProvider } from "../providers";
import { useSession } from "next-auth/react";
import { useAppDispatch } from "../store/hooks";
import { reconcileCartWithCatalog } from "../store/slices/cartSlice";
import { toast } from "sonner";

interface MenuItem {
  label: string;
  href: string;
}

interface MobileMenuProps {
  menuItems: MenuItem[];
}

function CartBackgroundTasks() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let isCancelled = false;

    const syncCart = async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (!isCancelled && Array.isArray(data)) {
          dispatch(reconcileCartWithCatalog(data as DTProduct[]));
        }
      } catch (error) {
        console.error("Cart sync failed:", error);
      }
    };

    syncCart();
    const intervalId = setInterval(syncCart, 5 * 60 * 1000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [dispatch]);

  useEffect(() => {
    const noticeKey = "cart_auto_cleared_notice_v1";
    const rawNotice = localStorage.getItem(noticeKey);

    if (!rawNotice) return;

    localStorage.removeItem(noticeKey);
    toast.warning("Корзина очищена автоматически (раз в 24 часа).");
  }, []);

  return null;
}

const MobileMenu = ({ menuItems }: MobileMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [homepageVisibility, setHomepageVisibility] = useState({
    recentProductsEnabled: true,
    weeklyOffersEnabled: true,
  });
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    let isCancelled = false;

    const loadHomepageVisibility = async () => {
      try {
        const response = await fetch("/api/homepage-settings", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as {
          recentProductsEnabled?: boolean;
          weeklyOffersEnabled?: boolean;
        };

        if (isCancelled) return;
        setHomepageVisibility({
          recentProductsEnabled: Boolean(data.recentProductsEnabled),
          weeklyOffersEnabled: Boolean(data.weeklyOffersEnabled),
        });
      } catch (error) {
        console.error("Failed to load homepage visibility settings:", error);
      }
    };

    void loadHomepageVisibility();

    const handleWindowFocus = () => {
      void loadHomepageVisibility();
    };
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isCancelled = true;
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [pathname]);

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.href === "/products/new") {
      return homepageVisibility.recentProductsEnabled;
    }

    if (item.href === "/products/weekly-offers") {
      return homepageVisibility.weeklyOffersEnabled;
    }

    return true;
  });

  const normalizedPathname = (pathname || "/").replace(/\/+$/, "") || "/";

  const normalizeHref = (href: string) =>
    (href.split("#")[0] || "/").replace(/\/+$/, "") || "/";

  const isMatch = (href: string) => {
    const normalizedHref = normalizeHref(href);
    if (normalizedHref === "/") {
      return normalizedPathname === "/";
    }

    if (normalizedHref === "/products" && normalizedPathname.startsWith("/product/")) {
      return true;
    }

    return (
      normalizedPathname === normalizedHref ||
      normalizedPathname.startsWith(`${normalizedHref}/`)
    );
  };

  const getMatchScore = (href: string) => {
    if (!isMatch(href)) return -1;
    const normalizedHref = normalizeHref(href);
    if (normalizedHref === normalizedPathname) return 10_000 + normalizedHref.length;
    return normalizedHref.length;
  };

  const resolvedMenuItems = visibleMenuItems.map(({ label, href }) => {
    let finalHref = href;
    let displayLabel = label;

    if (href === "/admin/login") {
      finalHref = session ? "/admin" : "/admin/login";
      displayLabel = session ? "Администраторам" : "Сотрудникам";
    }

    return { label: displayLabel, finalHref };
  });

  const bestMatch =
    resolvedMenuItems
      .map((item) => ({
        href: item.finalHref,
        score: getMatchScore(item.finalHref),
      }))
      .sort((a, b) => b.score - a.score)[0] ?? null;

  const activeFinalHref =
    bestMatch && bestMatch.score >= 0 ? bestMatch.href : null;

  return (
    <ReduxProvider>
      <CartBackgroundTasks />

      <div className="flex items-center gap-4 lg:hidden">
        <button
          className="text-[color:var(--color-foreground)] hover:text-amber-700 transition"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <MiniCart onNavigate={() => setIsMenuOpen(false)} />
      </div>

      <nav
        className={`fixed lg:static top-[var(--header-height)] lg:top-auto left-0 lg:left-auto w-full lg:w-auto z-40 lg:z-auto bg-[color:var(--color-surface)]/96 lg:bg-transparent border-b lg:border-0 lg:flex flex-col lg:flex-row items-start lg:items-center p-4 lg:p-0 transition-all shadow-sm lg:shadow-none backdrop-blur ${
          isMenuOpen ? "block" : "hidden"
        }`}
        style={{ borderColor: "var(--color-border)" }}
      >
        {resolvedMenuItems.map(({ label, finalHref }) => {
          const isAdminLink = finalHref.startsWith("/admin");
          const isActive = activeFinalHref === finalHref;

          return (
            <Link
              key={label}
              href={finalHref}
              className={`px-3 py-2 block text-sm lg:text-base rounded-md whitespace-nowrap transition-colors ${
                isAdminLink
                  ? isActive
                    ? "font-semibold text-red-700 bg-red-100/80"
                    : "text-red-600 hover:text-red-700 hover:bg-red-50"
                  : isActive
                    ? "font-semibold text-amber-700 bg-amber-100/80 lg:bg-amber-100/70"
                    : "text-[color:var(--color-foreground)] hover:text-amber-700 hover:bg-amber-50/70 lg:hover:bg-transparent"
              }`}
              onClick={() => setIsMenuOpen(false)}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}

        <div className="hidden lg:flex lg:ml-4">
          <MiniCart onNavigate={() => setIsMenuOpen(false)} />
        </div>
      </nav>
    </ReduxProvider>
  );
};

export default MobileMenu;
