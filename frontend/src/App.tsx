import { useApiConsole } from "./application/useApiConsole";
import { Tabs } from "./presentation/components/Tabs";
import { CitizenAuthScreen } from "./presentation/screens/CitizenAuthScreen";
import { OfficerAuthScreen } from "./presentation/screens/OfficerAuthScreen";
import { OutputScreen } from "./presentation/screens/OutputScreen";
import { ProfileScreen } from "./presentation/screens/ProfileScreen";
import { colors, styles } from "./presentation/styles";

export default function ApiConsoleApp() {
  const consoleState = useApiConsole();
  const { activeTab, apiBase, lastResponse, status, actions } = consoleState;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.topbar}>
          <div>
            <h1 style={{ margin: 0, color: colors.primaryDark, fontSize: 24 }}>
              ComplainKendra Sprint 1 API Console
            </h1>
            <small>Citizen authentication, profile management, and officer sessions</small>
          </div>
          <label style={styles.label}>
            API Base
            <input
              value={apiBase}
              onChange={(event) => actions.setApiBase(event.currentTarget.value)}
              style={styles.input}
            />
          </label>
        </div>
      </header>

      <main style={styles.main}>
        <nav style={styles.tabs}>
          <Tabs activeTab={activeTab} onChange={actions.setActiveTab} />
        </nav>

        <div
          style={{
            ...styles.status,
            color: status.tone === "error" ? colors.danger : colors.primaryDark,
          }}
        >
          {status.message}
        </div>

        {activeTab === "citizen" ? <CitizenAuthScreen consoleState={consoleState} /> : null}
        {activeTab === "profile" ? <ProfileScreen consoleState={consoleState} /> : null}
        {activeTab === "officer" ? <OfficerAuthScreen consoleState={consoleState} /> : null}
        {activeTab === "output" ? <OutputScreen value={lastResponse} /> : null}
      </main>
    </div>
  );
}
