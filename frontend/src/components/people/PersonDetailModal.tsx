"use client";

import { useEffect, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Mail,
  Building2,
  Tag,
  Star,
  Smile,
} from "lucide-react";
import { type Person, RELATIONSHIP_COLORS, HIERARCHY_COLORS } from "./types";

interface PersonDetailModalProps {
  person: Person;
  allPeople: Person[];
  onClose: () => void;
  onNavigate: (person: Person) => void;
}

export function PersonDetailModal({
  person,
  allPeople,
  onClose,
  onNavigate,
}: PersonDetailModalProps) {
  const currentIndex = allPeople.findIndex((p) => p.id === person.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPeople.length - 1;

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(allPeople[currentIndex + 1]);
  }, [hasNext, currentIndex, allPeople, onNavigate]);

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(allPeople[currentIndex - 1]);
  }, [hasPrev, currentIndex, allPeople, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const relColor =
    RELATIONSHIP_COLORS[person.relationship] || RELATIONSHIP_COLORS.external;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      {/* Prev arrow */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row w-full max-w-3xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 hover:bg-black/40 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left — Photo */}
        <div className="sm:w-64 lg:w-72 flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 min-h-48 sm:min-h-0">
          {person.photo ? (
            <img
              src={`/api/people/photos/${encodeURIComponent(person.photo)}`}
              alt={person.name}
              className="w-full h-full object-cover"
              style={{ minHeight: "240px" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600" style={{ minHeight: "240px" }}>
              <Users className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Right — Details */}
        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          {/* Relationship badge */}
          {person.relationship && (
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${relColor}`}>
              {person.relationship}
            </span>
          )}

          {/* Name */}
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">
            {person.name}
            {person.alias && (
              <span className="text-base font-normal text-neutral-400 ml-2">
                ({person.alias})
              </span>
            )}
          </h2>

          {/* Role · Affiliation · Hierarchy */}
          {(person.role || person.affiliation || person.hierarchy) && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3 flex items-center flex-wrap gap-1">
              {person.role && <span>{person.role}</span>}
              {person.role && person.affiliation && (
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
              )}
              {person.affiliation && <span>{person.affiliation}</span>}
              {person.hierarchy && (
                <span className={`text-xs font-medium ml-1 ${HIERARCHY_COLORS[person.hierarchy] || "text-neutral-400"}`}>
                  {person.hierarchy}
                </span>
              )}
            </p>
          )}

          {/* Industry */}
          {person.industry && (
            <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mb-3">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{person.industry}</span>
            </div>
          )}

          {/* Importance + Closeness */}
          {((person.importance || 0) > 0 || (person.closeness || 0) > 0) && (
            <div className="flex items-center gap-4 mb-3">
              {(person.importance || 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400" title={`중요도: ${person.importance}/5`}>
                  {Array.from({ length: person.importance }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5" fill="currentColor" />
                  ))}
                  <span className="text-neutral-400 text-xs ml-0.5">{person.importance}/5</span>
                </span>
              )}
              {(person.closeness || 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-pink-400" title={`친밀도: ${person.closeness}/5`}>
                  {Array.from({ length: person.closeness }).map((_, i) => (
                    <Smile key={i} className="w-3.5 h-3.5" />
                  ))}
                  <span className="text-neutral-400 text-xs ml-0.5">{person.closeness}/5</span>
                </span>
              )}
            </div>
          )}

          {/* Expertise tags */}
          {person.expertise.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {person.expertise.map((exp, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {exp}
                </span>
              ))}
            </div>
          )}

          {/* Email */}
          {person.email && (
            <div className="flex items-start gap-1.5 text-sm mb-4">
              <Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-neutral-400" />
              <div className="flex flex-col gap-0.5">
                {person.email.split(",").map((em, i) => (
                  <a
                    key={i}
                    href={`mailto:${em.trim()}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                  >
                    {em.trim()}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {person.notes && (
            <>
              <div className="border-t border-neutral-100 dark:border-neutral-800 mb-3" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-line leading-relaxed mb-4">
                {person.notes}
              </p>
            </>
          )}

          {/* Projects */}
          {person.projects.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Related in Projects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {person.projects.map((proj, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  >
                    {proj}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Connections */}
          {person.connections && person.connections.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Connections
              </p>
              <div className="flex flex-wrap gap-2">
                {person.connections.map((cid) => {
                  const connected = allPeople.find((p) => p.id === cid);
                  if (!connected) return null;
                  return (
                    <button
                      key={cid}
                      onClick={() => onNavigate(connected)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                        {connected.photo ? (
                          <img
                            src={`/api/people/photos/${encodeURIComponent(connected.photo)}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="w-3 h-3 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-neutral-600 dark:text-neutral-300">
                        {connected.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Counter */}
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400 text-right">
            {currentIndex + 1} / {allPeople.length}
          </div>
        </div>
      </div>

      {/* Next arrow */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
