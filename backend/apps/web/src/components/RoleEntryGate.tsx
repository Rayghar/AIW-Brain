import { RoleSelect } from "./RoleSelect";
import type { ExperienceProfileId } from "../lib/experienceProfiles";

interface RoleEntryGateProps {
  currentRole: ExperienceProfileId;
  onSetRole: (role: ExperienceProfileId) => void;
  onOpenDesignIntent: () => void;
  onOpenCockpit: () => void;
}

export function RoleEntryGate({ currentRole, onSetRole, onOpenDesignIntent, onOpenCockpit }: RoleEntryGateProps) {
  const finish = (role: ExperienceProfileId) => {
    const newProject = sessionStorage.getItem("aiw.newProjectPending") === "true";
    if (newProject) {
      localStorage.removeItem("aiw.firstRunTour.rc10_49.pending");
      localStorage.setItem("aiw.firstRunTour.rc10_49.dismissed", "true");
    } else {
      localStorage.setItem("aiw.firstRunTour.rc10_49.pending", "true");
      localStorage.removeItem("aiw.firstRunTour.rc10_49.dismissed");
    }
    onSetRole(role);
    sessionStorage.removeItem("aiw.newProjectPending");
    if (newProject && role === "solution-architect") onOpenDesignIntent();
    else onOpenCockpit();
  };

  return (
    <RoleSelect
      currentRole={currentRole}
      onSelect={finish}
      onSkip={() => {
        const newProject = sessionStorage.getItem("aiw.newProjectPending") === "true";
        onSetRole(currentRole);
        sessionStorage.removeItem("aiw.newProjectPending");
        if (newProject) onOpenDesignIntent();
        else onOpenCockpit();
      }}
    />
  );
}
