'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppTabType, PipelineStats } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
  pipelineStats: PipelineStats;
  expertsPipelineStats: PipelineStats;
  membersClubsPipelineStats: PipelineStats;
  bigPurchasesCount: number;
  onExpandedChange?: (expanded: boolean) => void;
}

type NavItem = {
  id: AppTabType;
  label: string;
  icon: JSX.Element;
};

type SectionId = 'partnerships' | 'experts' | 'members-clubs';

type SectionConfig = {
  id: SectionId;
  label: string;
  icon: JSX.Element;
  items: NavItem[];
};

const dashboardIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const closedIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const potentialIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const contactedIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const leadsIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const negotiationIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const signedIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const directoryIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const healthIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const purchasesIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14l-1.2 10.2a2 2 0 01-2 1.8H8.2a2 2 0 01-2-1.8L5 8zM9 8V6a3 3 0 016 0v2" />
  </svg>
);

const expertsDirectoryIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-8 0v2m8 0H9m4-10a3 3 0 110 6 3 3 0 010-6z" />
  </svg>
);

const membersClubsDirectoryIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" />
  </svg>
);

const sectionChevron = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
  </svg>
);

const sections: SectionConfig[] = [
  {
    id: 'partnerships',
    label: 'Partnerships',
    icon: directoryIcon,
    items: [
      { id: 'closed', label: 'Closed', icon: closedIcon },
      { id: 'potential', label: 'Potential Leads', icon: potentialIcon },
      { id: 'contacted', label: 'Contacted', icon: contactedIcon },
      { id: 'leads', label: 'Leads', icon: leadsIcon },
      { id: 'negotiation', label: 'Negotiation', icon: negotiationIcon },
      { id: 'signed', label: 'Signed', icon: signedIcon },
      { id: 'all', label: 'Partnership Directory', icon: directoryIcon },
    ],
  },
  {
    id: 'experts',
    label: 'Experts',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    items: [
      { id: 'experts-contacted', label: 'Contacted', icon: contactedIcon },
      { id: 'experts-leads', label: 'Leads', icon: leadsIcon },
      { id: 'experts-negotiation', label: 'Negotiation', icon: negotiationIcon },
      { id: 'experts-signed', label: 'Signed', icon: signedIcon },
      { id: 'experts-all', label: 'All Experts', icon: expertsDirectoryIcon },
    ],
  },
  {
    id: 'members-clubs',
    label: 'Members Clubs',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" />
      </svg>
    ),
    items: [
      { id: 'clubs-contacted', label: 'Contacted', icon: contactedIcon },
      { id: 'clubs-leads', label: 'Leads', icon: leadsIcon },
      { id: 'clubs-negotiation', label: 'Negotiation', icon: negotiationIcon },
      { id: 'clubs-signed', label: 'Signed', icon: signedIcon },
      { id: 'clubs-all', label: 'All Members Clubs', icon: membersClubsDirectoryIcon },
    ],
  },
];

const topLevelNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: dashboardIcon },
];

const operationsNavItems: NavItem[] = [
  { id: 'partner-health', label: 'Partner Health', icon: healthIcon },
  { id: 'big-purchases', label: 'Big Purchases', icon: purchasesIcon },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  pipelineStats,
  expertsPipelineStats,
  membersClubsPipelineStats,
  bigPurchasesCount,
  onExpandedChange,
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<SectionId, boolean>>({
    partnerships: false,
    experts: false,
    'members-clubs': false,
  });
  const { user, logout } = useAuth();

  const handleMouseEnter = () => {
    setIsExpanded(true);
    onExpandedChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
    onExpandedChange?.(false);
  };

  const toggleSection = (sectionId: SectionId) => {
    setExpandedSections((current) => {
      const isCurrentlyExpanded = current[sectionId];

      return {
        partnerships: false,
        experts: false,
        'members-clubs': false,
        [sectionId]: !isCurrentlyExpanded,
      };
    });
  };

  const getStatsForTab = (id: AppTabType): PipelineStats => {
    if (id.startsWith('experts-')) {
      return expertsPipelineStats;
    }
    if (id.startsWith('clubs-')) {
      return membersClubsPipelineStats;
    }
    return pipelineStats;
  };

  const getCount = (id: AppTabType): number | undefined => {
    const stats = getStatsForTab(id);

    switch (id) {
      case 'closed':
        return stats.closed;
      case 'potential':
        return stats.potential;
      case 'contacted':
      case 'experts-contacted':
      case 'clubs-contacted':
        return stats.contacted;
      case 'leads':
      case 'experts-leads':
      case 'clubs-leads':
        return stats.leads;
      case 'negotiation':
      case 'experts-negotiation':
      case 'clubs-negotiation':
        return stats.negotiation;
      case 'signed':
      case 'experts-signed':
      case 'clubs-signed':
        return stats.signed;
      case 'all':
      case 'experts-all':
      case 'clubs-all':
        return stats.total;
      case 'big-purchases':
        return bigPurchasesCount;
      default:
        return undefined;
    }
  };

  useEffect(() => {
    const nextSection: SectionId | null =
      activeTab.startsWith('experts-')
        ? 'experts'
        : activeTab.startsWith('clubs-')
        ? 'members-clubs'
        : ['closed', 'potential', 'contacted', 'leads', 'negotiation', 'signed', 'all'].includes(activeTab)
        ? 'partnerships'
        : null;

    if (!nextSection) return;

    setExpandedSections({
      partnerships: nextSection === 'partnerships',
      experts: nextSection === 'experts',
      'members-clubs': nextSection === 'members-clubs',
    });
  }, [activeTab]);

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed left-0 top-0 h-screen bg-blckbx-black text-blckbx-sand flex flex-col transition-all duration-300 ease-in-out z-50 ${
        isExpanded ? 'w-72' : 'w-16'
      }`}
    >
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

      <nav className={`flex-1 overflow-y-auto transition-all duration-300 ${isExpanded ? 'p-4' : 'p-2'}`}>
        <div className="space-y-3">
          <div className="space-y-1">
            {topLevelNavItems.map((item) => {
              const count = getCount(item.id);
              const isActive =
                item.id === 'dashboard'
                  ? activeTab === 'dashboard' || activeTab === 'experts-dashboard' || activeTab === 'clubs-dashboard'
                  : activeTab === item.id;

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
          </div>

          {sections.map((section) => {
            const sectionExpanded = expandedSections[section.id];

            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center rounded-lg transition-colors ${
                    isExpanded
                      ? 'px-3 py-2 text-blckbx-sand/50 hover:text-blckbx-sand/80'
                      : 'p-3 justify-center text-blckbx-sand/60'
                  }`}
                  title={!isExpanded ? section.label : undefined}
                >
                  <span className="flex-shrink-0">{section.icon}</span>
                  <span
                    className={`ml-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                      isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 ml-0'
                    }`}
                  >
                    {section.label}
                  </span>
                  {isExpanded && (
                    <span className={`ml-auto transition-transform duration-200 ${sectionExpanded ? 'rotate-90' : ''}`}>
                      {sectionChevron}
                    </span>
                  )}
                </button>

                {sectionExpanded && (
                  <div className="space-y-1 mt-1">
                    {section.items.map((item) => {
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
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2">
            <div
              className={`w-full flex items-center rounded-lg transition-colors ${
                isExpanded
                  ? 'px-3 py-2 text-blckbx-sand/50'
                  : 'p-3 justify-center text-blckbx-sand/60'
              }`}
              title={!isExpanded ? 'Operations' : undefined}
            >
              <span className="flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </span>
              <span
                className={`ml-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 ml-0'
                }`}
              >
                Operations
              </span>
            </div>

            <div className="space-y-1 mt-1">
              {operationsNavItems.map((item) => {
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
            </div>
          </div>
        </div>
      </nav>

      <div className={`border-t border-white/10 transition-all duration-300 ${isExpanded ? 'p-4' : 'p-2'}`}>
        <div className={`flex items-center text-blckbx-sand/60 ${isExpanded ? 'gap-3' : 'justify-center'}`}>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blckbx-cta/20 flex items-center justify-center flex-shrink-0">
              <span className="text-blckbx-cta font-medium text-sm">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${
            isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
          }`}>
            <p className="text-sm font-medium text-blckbx-sand truncate">{user?.name || 'User'}</p>
            <p className="text-xs truncate">{user?.email || ''}</p>
          </div>
          {isExpanded && (
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
