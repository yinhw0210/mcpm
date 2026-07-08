use tokio::process::Command;

pub fn augmented_path() -> String {
    let current_path = std::env::var("PATH").unwrap_or_default();

    #[cfg(target_os = "macos")]
    {
        let home = dirs::home_dir()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_default();
        let extra_paths = [
            "/opt/homebrew/bin".to_string(),
            "/usr/local/bin".to_string(),
            "/opt/homebrew/opt/bun/bin".to_string(),
            format!("{}/.nvm/versions/node/current/bin", home),
            format!("{}/.cargo/bin", home),
            format!("{}/.bun/bin", home),
        ];

        return format!("{}:{}", extra_paths.join(":"), current_path);
    }

    #[cfg(not(target_os = "macos"))]
    {
        current_path
    }
}

pub fn ensure_runtime_path_env() {
    std::env::set_var("PATH", augmented_path());
}

pub fn apply_runtime_path_to_command(cmd: &mut Command) {
    cmd.env("PATH", augmented_path());
}
