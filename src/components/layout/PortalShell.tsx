import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CommandPalette } from './CommandPalette';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { metaForPath, type PortalConfig } from './navConfig';
export function PortalShell({
  portal


}: {portal: PortalConfig;}) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const meta = metaForPath(location.pathname);
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return <div className="min-h-screen w-full bg-app">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar portal={portal} />
      </div>

      <AnimatePresence>
        {drawerOpen && <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} transition={{
          duration: 0.2,
          ease: [0.23, 1, 0.32, 1]
        }} onClick={() => setDrawerOpen(false)} />
            <motion.div className="absolute inset-y-0 left-0" initial={{
          x: -300
        }} animate={{
          x: 0
        }} exit={{
          x: -300
        }} transition={{
          duration: 0.24,
          ease: [0.23, 1, 0.32, 1]
        }}>
              <Sidebar portal={portal} onNavigate={() => setDrawerOpen(false)} />
            </motion.div>
          </div>}
      </AnimatePresence>

      <div className="min-w-0 max-w-full lg:pl-[280px]">
        <TopBar title={meta.title} subtitle={meta.subtitle} onOpenMenu={() => setDrawerOpen(true)} onOpenCommandPalette={() => setPaletteOpen(true)} />
        <main className="main-content min-w-0 max-w-full px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <MobileNav portal={portal} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>;
}