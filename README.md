# CarePlus v2 — Care-Team Foundation

CarePlus v2 is a patient relationship management system for a real clinic centered around active care team membership and role-based security.

## Prerequisites

The Firestore emulator requires **Java (JDK 21 or above)**.

### Installing Java

- **Ubuntu / Debian**:
  ```bash
  sudo apt-get update
  sudo apt-get install -y openjdk-21-jre-headless
  ```

- **macOS** (Homebrew):
  ```bash
  brew install openjdk@21
  ```

- **Verify installation**:
  ```bash
  java -version
  ```
  Ensure the output indicates version 21 or above.

## Running the Security Rules Test Suite

The tests execute against the official Firebase Firestore Emulator using `@firebase/rules-unit-testing`.

To run the complete test suite:

```bash
npm test
```

This runs:
```bash
firebase emulators:exec --only firestore "tsx --test test/firestore.rules.test.ts"
```

The emulator starts automatically on port 8088, loads `firestore.rules`, executes all test cases (both base test suite and review scenario probes), and tears down when done.

## Development

Start the Vite development application:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```
