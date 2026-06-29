import { useApiConsole } from "../../application/useApiConsole";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";
import { styles } from "../styles";

type ConsoleState = ReturnType<typeof useApiConsole>;

export function OfficerAuthScreen({ consoleState }: { consoleState: ConsoleState }) {
  const { officerLogin, session, actions } = consoleState;

  return (
    <div style={styles.grid}>
      <Panel title="Officer Login">
        <FormField
          label="Email"
          type="email"
          value={officerLogin.email}
          onChange={(email) => actions.setOfficerLogin({ ...officerLogin, email })}
        />
        <FormField
          label="Password"
          type="password"
          value={officerLogin.password}
          onChange={(password) => actions.setOfficerLogin({ ...officerLogin, password })}
        />
        <div style={styles.buttonRow}>
          <Button onClick={actions.loginOfficer}>Login</Button>
          <Button onClick={actions.getOfficerSessions} tone="secondary">
            Sessions
          </Button>
          <Button onClick={actions.logoutOfficer} tone="secondary">
            Logout Current
          </Button>
          <Button onClick={actions.logoutAllOfficerSessions} tone="danger">
            Logout All
          </Button>
        </div>
        <p style={styles.hint}>
          Officer token: {session.officerToken ? "stored" : "not stored"}
        </p>
      </Panel>
    </div>
  );
}
