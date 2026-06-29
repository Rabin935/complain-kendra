import { useApiConsole } from "../../application/useApiConsole";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";
import { styles } from "../styles";

type ConsoleState = ReturnType<typeof useApiConsole>;

export function ProfileScreen({ consoleState }: { consoleState: ConsoleState }) {
  const { profile, actions } = consoleState;

  return (
    <div style={styles.grid}>
      <Panel title="Profile">
        <FormField
          label="Name"
          value={profile.name}
          onChange={(name) => actions.setProfile({ ...profile, name })}
        />
        <FormField
          label="Phone"
          value={profile.phone}
          onChange={(phone) => actions.setProfile({ ...profile, phone })}
        />
        <FormField
          label="Avatar URL"
          type="url"
          value={profile.avatarUrl}
          onChange={(avatarUrl) => actions.setProfile({ ...profile, avatarUrl })}
        />
        <label style={styles.label}>
          Language
          <select
            value={profile.language}
            onChange={(event) =>
              actions.setProfile({
                ...profile,
                language: event.currentTarget.value === "Nepali" ? "Nepali" : "English",
              })
            }
            style={styles.input}
          >
            <option value="English">English</option>
            <option value="Nepali">Nepali</option>
          </select>
        </label>
        <label style={{ ...styles.label, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={profile.isPublic}
            onChange={(event) =>
              actions.setProfile({ ...profile, isPublic: event.currentTarget.checked })
            }
          />
          Public profile
        </label>
        <div style={styles.buttonRow}>
          <Button onClick={actions.getProfile}>Get Profile</Button>
          <Button onClick={actions.updateProfile} tone="secondary">
            Update Profile
          </Button>
          <Button onClick={actions.updateLanguage} tone="secondary">
            Set Language
          </Button>
        </div>
      </Panel>

      <Panel title="Change Password">
        <FormField
          label="Current Password"
          type="password"
          value={profile.currentPassword}
          onChange={(currentPassword) =>
            actions.setProfile({ ...profile, currentPassword })
          }
        />
        <FormField
          label="New Password"
          type="password"
          value={profile.newPassword}
          onChange={(newPassword) => actions.setProfile({ ...profile, newPassword })}
        />
        <div style={styles.buttonRow}>
          <Button onClick={actions.changePassword}>Change Password</Button>
        </div>
      </Panel>
    </div>
  );
}
