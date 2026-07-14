import { ArrowRight, Compass, Crosshair, Map, PlayCircle } from "lucide-react";
import { getRoleTools, type RoleToolItem } from "../lib/roleTools";

export function RoleToolsTray(props: any) {
  const {
    activeRoleJourney,
    onOpenTool,
    isToolActive,
    onOpenRoleJourney,
    onOpenCapabilityMap,
  } = props;
  const roleId = activeRoleJourney?.id ?? "solution-architect";
  const tools = getRoleTools(roleId, false);

  return (
    <section className="role-tools-tray role-tools-tray--task-launcher" data-aiw-tour="role-tools" aria-label={`${activeRoleJourney?.label ?? "Role"} contextual task tools`}>
      <div className="role-tools-tray__header">
        <div>
          <span className="eyebrow"><Compass size={13} /> Contextual task launcher</span>
          <h3>{`${activeRoleJourney?.shortLabel ?? "Role"} task tools`}</h3>
          <p>These are not primary navigation pages. They are task launchers that support the current role and stage. Use command search or the capability map for the complete AIW surface.</p>
        </div>
        <div className="role-tools-tray__actions">
          <button type="button" onClick={onOpenCapabilityMap} title="Open the complete AIW capability map">
            <Map size={14} /> Capability map
          </button>
          <button type="button" onClick={onOpenRoleJourney} title="Explain the active role journey and available role paths">
            Journey map <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <div className="role-tools-tray__grid role-tools-tray__grid--tasks">
        {tools.map((tool: RoleToolItem) => {
          const Icon = tool.icon;
          return (
            <button key={`${tool.target.kind}-${tool.id}`} type="button" className={isToolActive?.(tool) ? "active" : ""} onClick={() => onOpenTool?.(tool)} title={`${tool.title}: ${tool.description}`}>
              <Icon size={16} />
              <span>
                <strong>{tool.label}</strong>
                <small>{tool.description}</small>
                <em><Crosshair size={11} /> {tool.lifecycleFit}</em>
              </span>
              <b><PlayCircle size={13} /> Start task</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}
