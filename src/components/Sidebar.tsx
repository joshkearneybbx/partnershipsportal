'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PipelineStats } from '@/types';

type TabType = 'dashboard' | 'leads' | 'negotiation' | 'signed' | 'all' | 'partner-health';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pipelineStats: PipelineStats;
  onExpandedChange?: (expanded: boolean) => void;
}

const navItems: { id: TabType; label: string; icon: JSX.Element }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'signed',
    label: 'Signed',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'all',
    label: 'All Partners',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'partner-health',
    label: 'Partner Health',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

export default function Sidebar({ activeTab, setActiveTab, pipelineStats, onExpandedChange }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMouseEnter = () => {
    setIsExpanded(true);
    onExpandedChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
    onExpandedChange?.(false);
  };

  const getCount = (id: TabType): number | undefined => {
    switch (id) {
      case 'leads':
        return pipelineStats.leads;
      case 'negotiation':
        return pipelineStats.negotiation;
      case 'signed':
        return pipelineStats.signed;
      case 'all':
        return pipelineStats.total;
      default:
        return undefined;
    }
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed left-0 top-0 h-screen bg-blckbx-black text-blckbx-sand flex flex-col transition-all duration-300 ease-in-out z-50 ${
        isExpanded ? 'w-72' : 'w-16'
      }`}
    >
      {/* Logo */}
      <div className={`border-b border-white/10 transition-all duration-300 ${isExpanded ? 'p-6' : 'p-3'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blckbx-cta rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="font-display text-xl font-bold text-white">B</span>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            <h1 className="font-display text-xl font-semibold tracking-tight whitespace-nowrap">BlckBx</h1>
            <p className="text-xs text-blckbx-sand/60 whitespace-nowrap">Partnerships Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-1 transition-all duration-300 ${isExpanded ? 'p-4' : 'p-2'}`}>
        <p className={`text-xs uppercase tracking-wider text-blckbx-sand/40 px-3 mb-4 font-medium overflow-hidden transition-all duration-300 ${
          isExpanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 mb-0'
        }`}>
          Pipeline
        </p>
        {navItems.map((item) => {
          const count = getCount(item.id);
          const isActive = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center rounded-lg transition-all duration-200 group ${
                isExpanded ? 'px-3 py-2.5 justify-between' : 'p-3 justify-center'
              } ${
                isActive
                  ? 'bg-blckbx-cta text-white'
                  : 'text-blckbx-sand/70 hover:text-blckbx-sand hover:bg-white/5'
              }`}
              whileHover={{ x: isActive || !isExpanded ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
              title={!isExpanded ? item.label : undefined}
            >
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0">{item.icon}</span>
                <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                }`}>
                  {item.label}
                </span>
              </div>
              {count !== undefined && isExpanded && (
                <span className={`text-sm px-2 py-0.5 rounded-full transition-opacity duration-300 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-blckbx-sand/60 group-hover:bg-white/15'
                }`}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/10 transition-all duration-300 ${isExpanded ? 'p-4' : 'p-2'}`}>
        <div className={`flex items-center text-blckbx-sand/60 ${isExpanded ? 'gap-3' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded-full bg-blckbx-cta/20 flex items-center justify-center flex-shrink-0">
            <span className="text-blckbx-cta font-medium text-sm">JW</span>
          </div>
          <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${
            isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
          }`}>
            <p className="text-sm font-medium text-blckbx-sand truncate">Josh W.</p>
            <p className="text-xs truncate">AI Solutions Engineer</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
