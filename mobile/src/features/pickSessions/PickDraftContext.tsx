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

export type PickDraftLocation = {
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  searchRadiusMiles: number;
};

export type PickDraftSessionFilters = {
  diningStyleIds: number[];
  diningStyleNames: string[];
  openNow: boolean;
  somethingNew: boolean;
  cuisineIds: number[];
  filtersReviewed: boolean;
};

export type PickDraft =
  PickDraftPeople
  & PickDraftLocation
  & PickDraftSessionFilters
  & {
    // These remain in the payload for backend compatibility.
    // They are no longer edited during session setup.
    priceMin: number;
    priceMax: number;
  };

type PickDraftContextValue = {
  draft: PickDraft;
  updatePeople: (
    people: PickDraftPeople,
  ) => void;
  updateLocation: (
    location: PickDraftLocation,
  ) => void;
  updateSessionFilters: (
    filters: PickDraftSessionFilters,
  ) => void;
  resetPeople: () => void;
  resetLocation: () => void;
  resetSessionFilters: () => void;
  resetDraft: () => void;
};

const DEFAULT_PEOPLE: PickDraftPeople = {
  groupId: null,
  groupName: "",
  participantIds: [],
  participantNames: [],
  isJustMe: false,
};

const DEFAULT_LOCATION: PickDraftLocation = {
  locationLabel: "",
  latitude: null,
  longitude: null,
  searchRadiusMiles: 10,
};

const DEFAULT_SESSION_FILTERS:
  PickDraftSessionFilters = {
    diningStyleIds: [],
    diningStyleNames: [],
    openNow: true,
    somethingNew: false,
    cuisineIds: [],
    filtersReviewed: false,
  };

export const DEFAULT_PICK_DRAFT: PickDraft = {
  ...DEFAULT_PEOPLE,
  ...DEFAULT_LOCATION,
  ...DEFAULT_SESSION_FILTERS,
  priceMin: 1,
  priceMax: 4,
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
    setDraft((current) => ({
      ...current,
      ...people,
      participantIds: [...people.participantIds],
      participantNames: [...people.participantNames],
    }));
  }

  function updateLocation(
    location: PickDraftLocation,
  ) {
    setDraft((current) => ({
      ...current,
      ...location,
    }));
  }

  function updateSessionFilters(
    filters: PickDraftSessionFilters,
  ) {
    setDraft((current) => ({
      ...current,
      ...filters,
      diningStyleIds: [
        ...filters.diningStyleIds,
      ],
      diningStyleNames: [
        ...filters.diningStyleNames,
      ],
      cuisineIds: [...filters.cuisineIds],
    }));
  }

  function resetPeople() {
    setDraft((current) => ({
      ...current,
      ...DEFAULT_PEOPLE,
    }));
  }

  function resetLocation() {
    setDraft((current) => ({
      ...current,
      ...DEFAULT_LOCATION,
    }));
  }

  function resetSessionFilters() {
    setDraft((current) => ({
      ...current,
      ...DEFAULT_SESSION_FILTERS,
    }));
  }

  function resetDraft() {
    setDraft({
      ...DEFAULT_PICK_DRAFT,
      participantIds: [],
      participantNames: [],
      cuisineIds: [],
      diningStyleIds: [],
      diningStyleNames: [],
    });
  }

  const value = useMemo<PickDraftContextValue>(
    () => ({
      draft,
      updatePeople,
      updateLocation,
      updateSessionFilters,
      resetPeople,
      resetLocation,
      resetSessionFilters,
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
  const context = useContext(PickDraftContext);

  if (!context) {
    throw new Error(
      "usePickDraft must be used inside PickDraftProvider.",
    );
  }

  return context;
}
