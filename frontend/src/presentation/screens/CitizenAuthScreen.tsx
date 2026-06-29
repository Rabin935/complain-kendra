import { useApiConsole } from "../../application/useApiConsole";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";
import { styles } from "../styles";

type ConsoleState = ReturnType<typeof useApiConsole>;

export function CitizenAuthScreen({ consoleState }: { consoleState: ConsoleState }) {
  const {
    citizenLogin,
    citizenRegister,
    passwordReset,
    session,
    actions,
  } = consoleState;

  return (
    <div style={styles.grid}>
      <Panel title="Citizen Login">
        <FormField
          label="Email"
          type="email"
          value={citizenLogin.email}
          onChange={(email) => actions.setCitizenLogin({ ...citizenLogin, email })}
        />
        <FormField
          label="Password"
          type="password"
          value={citizenLogin.password}
          onChange={(password) => actions.setCitizenLogin({ ...citizenLogin, password })}
        />
        <div style={styles.buttonRow}>
          <Button onClick={actions.loginCitizen}>Login</Button>
          <Button onClick={actions.refreshCitizen} tone="secondary">
            Refresh Token
          </Button>
          <Button onClick={actions.logoutCitizen} tone="secondary">
            Logout
          </Button>
        </div>
        <p style={styles.hint}>
          Citizen token: {session.citizenToken ? "stored" : "not stored"}
        </p>
      </Panel>

      <Panel title="Citizen Register">
        <FormField
          label="Name"
          value={citizenRegister.name}
          onChange={(name) => actions.setCitizenRegister({ ...citizenRegister, name })}
        />
        <FormField
          label="Email"
          type="email"
          value={citizenRegister.email}
          onChange={(email) => actions.setCitizenRegister({ ...citizenRegister, email })}
        />
        <FormField
          label="Password"
          type="password"
          value={citizenRegister.password}
          onChange={(password) => actions.setCitizenRegister({ ...citizenRegister, password })}
        />
        <FormField
          label="Phone"
          value={citizenRegister.phone}
          onChange={(phone) => actions.setCitizenRegister({ ...citizenRegister, phone })}
        />
        <div style={styles.buttonRow}>
          <Button onClick={actions.registerCitizen}>Register</Button>
        </div>
      </Panel>

      <Panel
        title="Password Reset"
        description="The backend prints the mock reset token in the server console."
      >
        <FormField
          label="Email"
          type="email"
          value={passwordReset.email}
          onChange={(email) => actions.setPasswordReset({ ...passwordReset, email })}
        />
        <FormField
          label="Reset Token"
          value={passwordReset.token}
          onChange={(token) => actions.setPasswordReset({ ...passwordReset, token })}
        />
        <FormField
          label="New Password"
          type="password"
          value={passwordReset.password}
          onChange={(password) => actions.setPasswordReset({ ...passwordReset, password })}
        />
        <div style={styles.buttonRow}>
          <Button onClick={actions.forgotPassword}>Send Reset Token</Button>
          <Button onClick={actions.resetPassword} tone="secondary">
            Reset Password
          </Button>
        </div>
      </Panel>
    </div>
  );
}
