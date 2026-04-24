use std::fs;

const APP_NAME: &str = "wholesale_pos";

pub fn store_secret(key: &str, value: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(APP_NAME, key).map_err(|e| e.to_string())?;
    match entry.set_password(value) {
        Ok(_) => Ok(()),
        Err(_) => {
            let fallback_dir = dirs::data_dir()
                .ok_or("Could not determine data dir")?
                .join(APP_NAME);
            fs::create_dir_all(&fallback_dir).map_err(|e| e.to_string())?;
            let path = fallback_dir.join(format!("secret_{}.txt", key));
            fs::write(&path, value).map_err(|e| e.to_string())?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = fs::metadata(&path).map_err(|e| e.to_string())?.permissions();
                perms.set_mode(0o600);
                fs::set_permissions(&path, perms).map_err(|e| e.to_string())?;
            }
            Ok(())
        }
    }
}

pub fn get_secret(key: &str) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(APP_NAME, key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(_) => {
            let fallback_dir = dirs::data_dir()
                .ok_or("Could not determine data dir")?
                .join(APP_NAME);
            let path = fallback_dir.join(format!("secret_{}.txt", key));
            if path.exists() {
                let value = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                Ok(Some(value))
            } else {
                Ok(None)
            }
        }
    }
}

pub fn delete_secret(key: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(APP_NAME, key).map_err(|e| e.to_string())?;
    let _ = entry.delete_password();
    let fallback_dir = dirs::data_dir()
        .ok_or("Could not determine data dir")?
        .join(APP_NAME);
    let path = fallback_dir.join(format!("secret_{}.txt", key));
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    Ok(())
}
