import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import type {
  PropsWithChildren,
} from "react";

export type PickDraftPeople = {
  groupId: string | null;
  groupName: string;
  participantIds: number[];
  participantNames: string[];
  isJustMe: boolean;
};

export type PickDraftFilters = {
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  searchRadiusMiles: number;
  priceMin: number;
  priceMax: number;
  openNow: boolean;
  includeDelivery: boolean;
  includeDriveThrough: boolean;
  somethingNew: boolean;
  cuisineIds: number[];
};

export type PickDraft = PickDraftPeople &
  PickDraftFilters;

type PickDraftContextValue = {
  draft: PickDraft;
  updatePeople: (
    people: PickDraftPeople,
  ) => void;
  updateFilters: (
    filters: PickDraftFilters,
  ) => void;
  resetPeople: () => void;
  resetFilters: () => void;
  resetDraft: () => void;
};

const DEFAULT_PEOPLE: PickDraftPeople = {
  groupId: null,
  groupName: "",
  participantIds: [],
  participantNames: [],
  isJustMe: false,
};

const DEFAULT_FILTERS: PickDraftFilters = {
  locationLabel: "",
  latitude: null,
  longitude: null,
  searchRadiusMiles: 10,
  priceMin: 1,
  priceMax: 3,
  openNow: true,
  includeDelivery: false,
  includeDriveThrough: false,
  somethingNew: false,
  cuisineIds: [],
};

export const DEFAULT_PICK_DRAFT: PickDraft = {
  ...DEFAULT_PEOPLE,
  ...DEFAULT_FILTERS,
};

const PickDraftContext =
  createContext<PickDraftContextValue | null>(
    null,
  );

export function PickDraftProvider({
  children,
}: PropsWithChildren) {
  const [draft, setDraft] = useState<PickDraft>(
    DEFAULT_PICK_DRAFT,
  );

  function updatePeople(
    people: PickDraftPeople,
  ) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...people,
      participantIds: [
        ...people.participantIds,
      ],
      participantNames: [
        ...people.participantNames,
      ],
    }));
  }

  function updateFilters(
    filters: PickDraftFilters,
  ) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...filters,
      cuisineIds: [...filters.cuisineIds],
    }));
  }

  function resetPeople() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...DEFAULT_PEOPLE,
    }));
  }

  function resetFilters() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...DEFAULT_FILTERS,
    }));
  }

  function resetDraft() {
    setDraft({
      ...DEFAULT_PICK_DRAFT,
      participantIds: [],
      participantNames: [],
      cuisineIds: [],
    });
  }

  const value = useMemo<PickDraftContextValue>(
    () => ({
      draft,
      updatePeople,
      updateFilters,
      resetPeople,
      resetFilters,
      resetDraft,
    }),
    [draft],
  );

  return (
    <PickDraftContext.Provider value={value}>
      {children}
    </PickDraftContext.Provider>
  );
}

export function usePickDraft(): PickDraftContextValue {
  const context = useContext(
    PickDraftContext,
  );

  if (!context) {
    throw new Error(
      "usePickDraft must be used inside PickDraftProvider.",
    );
  }

  return context;
}