import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TabList({ tabs, activeTab, onSelectTab, onAddTabClick }) {
  const tabScrollRef = useRef(null);

  useEffect(() => {
    const element = tabScrollRef.current;
    if (!element) return;

    const handleWheel = (e) => {
      // Convert vertical wheel movement to horizontal scroll
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        element.scrollBy({ left: e.deltaY, behavior: 'auto' });
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="px-4">
      <div 
        ref={tabScrollRef}
        className="flex items-center gap-2 overflow-x-auto pb-3 -mx-4 px-4 tab-scroll"
      >
        {tabs.filter(t => !t.hidden).map(tab => (
          <Button
            key={tab.id}
            variant={activeTab?.id === tab.id ? "default" : "outline"}
            onClick={() => onSelectTab(tab)}
            className={`rounded-full h-8 px-4 text-sm whitespace-nowrap transition-all duration-200 shrink-0 font-medium ${
              activeTab?.id === tab.id
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.name}
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={onAddTabClick}
          className="rounded-full h-8 w-8 p-0 flex items-center justify-center flex-shrink-0 bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          aria-label="Add new tab"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      <style jsx>{`
        .tab-scroll {
          scrollbar-width: none; /* Firefox */
        }
        .tab-scroll::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }
      `}</style>
    </div>
  );
}