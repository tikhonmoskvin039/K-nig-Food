"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

    loadHomepageVisibility();

    return () => {
      isCancelled = true;
    };
  }, []);

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.href === "/#recent-products") {
      return homepageVisibility.recentProductsEnabled;
    }

    if (item.href === "/#weekly-offers") {
      return homepageVisibility.weeklyOffersEnabled;
    }

    return true;
  });

  return (
    <ReduxProvider>
      <CartBackgroundTasks />

      <div className="flex items-center gap-4 md:hidden">
        <button
          className="text-[color:var(--color-foreground)] hover:text-amber-700 transition"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <MiniCart />
      </div>

      <nav
        className={`absolute md:static top-[68px] left-0 w-full md:w-auto bg-[color:var(--color-surface)]/95 md:bg-transparent border-b md:border-0 md:flex flex-col md:flex-row items-start md:items-center p-4 md:p-0 transition-all shadow-sm md:shadow-none backdrop-blur ${
          isMenuOpen ? "block" : "hidden"
        }`}
        style={{ borderColor: "var(--color-border)" }}
      >
        {visibleMenuItems.map(({ label, href }) => {
          let finalHref = href;

          // если это пункт "Сотрудникам"
          if (href === "/admin/login") {
            finalHref = session ? "/admin" : "/admin/login";
            label = session ? "Администраторам" : "Сотрудникам";
          }

          return (
            <Link
              key={label}
              href={finalHref}
              className={`px-3 py-2 block text-sm md:text-base rounded-md whitespace-nowrap ${
                session && label == "Администраторам"
                  ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                  : "text-[color:var(--color-foreground)] hover:text-amber-700 hover:bg-amber-50/70 md:hover:bg-transparent"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {label}
            </Link>
          );
        })}

        <div className="hidden md:flex md:ml-4">
          <MiniCart />
        </div>
      </nav>
    </ReduxProvider>
  );
};

export default MobileMenu;
