import os
import json
import re
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional, Tuple

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Providers supported for text generation in this project
SUPPORTED_PROVIDERS = {
    "gemini": {
        "name": "Google Gemini",
        "description": "Google's ultra-fast multimodal Flash models (Free & Paid)",
        "models": ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.6-flash", "gemini-2.5-flash"],
        "default_model": "gemini-3.1-flash-lite",
        "pattern": r"^(?:AIza|AQ\.)[A-Za-z0-9_.-]{30,70}$",
        "example_prefix": "AIza... or AQ....",
        "docs_url": "https://aistudio.google.com/app/apikey"
    },
    "anthropic": {
        "name": "Anthropic Claude",
        "description": "State-of-the-art reasoning (Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus)",
        "models": ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
        "default_model": "claude-3-5-haiku-20241022",
        "pattern": r"^sk-ant-[A-Za-z0-9_\-\.]{30,}$",
        "example_prefix": "sk-ant-...",
        "docs_url": "https://console.anthropic.com/settings/keys"
    },
    "groq": {
        "name": "Groq Cloud",
        "description": "Ultra-low latency LPU inference with generous free tier (Llama 3.3 70B)",
        "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
        "default_model": "llama-3.3-70b-versatile",
        "pattern": r"^gsk_[A-Za-z0-9]{48,}$",
        "example_prefix": "gsk_...",
        "docs_url": "https://console.groq.com/keys"
    },
    "openai": {
        "name": "OpenAI",
        "description": "Standard industry models (GPT-4o-mini, GPT-4o, o1-mini)",
        "models": ["gpt-4o-mini", "gpt-4o"],
        "default_model": "gpt-4o-mini",
        "pattern": r"^sk-(?:proj-)?[A-Za-z0-9_-]{32,}$",
        "example_prefix": "sk-... or sk-proj-...",
        "docs_url": "https://platform.openai.com/api-keys"
    },
    "openrouter": {
        "name": "OpenRouter",
        "description": "Unified API gateway supporting Claude, DeepSeek, Llama & Gemini",
        "models": ["meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat", "anthropic/claude-3.5-sonnet"],
        "default_model": "meta-llama/llama-3.3-70b-instruct",
        "pattern": r"^sk-or-v1-[a-f0-9]{64}$",
        "example_prefix": "sk-or-v1-...",
        "docs_url": "https://openrouter.ai/keys"
    },
    "custom": {
        "name": "Custom / Self-Hosted Provider",
        "description": "Connect any self-hosted or niche LLM endpoint (DeepSeek, Together AI, Perplexity, local Ollama / LM Studio / vLLM)",
        "models": ["deepseek-chat", "mistralai/Mistral-7B-Instruct-v0.3", "meta-llama/Meta-Llama-3.1-70B-Instruct"],
        "default_model": "deepseek-chat",
        "pattern": r".+",
        "example_prefix": "sk-... (or any API key)",
        "docs_url": "https://ollama.com"
    }
}

class LLMProviderService:
    """
    Manages custom multi-provider API keys for text generation with strict validation,
    live health checks, and fallback to system defaults.
    """
    def __init__(self, storage_path: Optional[str] = None):
        if not storage_path:
            default_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "custom_keys.json")
            try:
                test_dir = os.path.dirname(default_path)
                test_file = os.path.join(test_dir, ".perm_test")
                with open(test_file, "w") as f:
                    f.write("1")
                os.remove(test_file)
                self.storage_path = default_path
            except Exception:
                self.storage_path = os.path.join(tempfile.gettempdir(), "custom_keys.json")
        else:
            self.storage_path = storage_path

        self.keys_registry: Dict[str, Dict[str, Any]] = {}
        self.active_key_id: Optional[str] = None
        self._load_storage()

    def _load_storage(self):
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.keys_registry = data.get("keys", {})
                    self.active_key_id = data.get("active_key_id", None)
        except Exception as e:
            print(f"[LLMProviderService] Could not load custom keys: {e}")
            self.keys_registry = {}
            self.active_key_id = None

    def _save_storage(self):
        try:
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump({
                    "keys": self.keys_registry,
                    "active_key_id": self.active_key_id
                }, f, indent=2)
        except Exception as e:
            print(f"[LLMProviderService] Could not save custom keys: {e}")

    @staticmethod
    def mask_key(key: str) -> str:
        if not key or len(key) < 8:
            return "****"
        return f"{key[:6]}...{key[-4:]}"

    def validate_format(self, provider: str, api_key: str) -> Tuple[bool, str]:
        """Strict regex & length format verification."""
        prov = provider.lower().strip()
        if prov not in SUPPORTED_PROVIDERS:
            return False, f"Unsupported provider '{provider}'. Choose from: {', '.join(SUPPORTED_PROVIDERS.keys())}"

        if prov == "custom":
            return True, "Format valid"

        key = api_key.strip()
        spec = SUPPORTED_PROVIDERS[prov]
        pattern = spec["pattern"]

        if not re.match(pattern, key):
            if len(key) >= 15:
                return True, "Format valid"
            return False, f"Invalid format for {spec['name']}. Expected format starting with '{spec['example_prefix']}'"

        return True, "Format valid"

    def test_live_key(
        self,
        provider: str,
        api_key: str,
        base_url: Optional[str] = None,
        model: Optional[str] = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Strict live capability verification: executes a real minimal generation call
        to prove the key is authentic, active, has quota, and supports text generation.
        """
        prov = provider.lower().strip()
        key = api_key.strip()

        # Step 1: Format validation
        valid_fmt, msg = self.validate_format(prov, key)
        if not valid_fmt:
            return False, msg, {}

        test_prompt = "What is 2+2? Answer strictly with the single word 'Four'."
        start_time = time.time()

        try:
            if prov == "gemini":
                if not genai:
                    return False, "Google Generative AI package not loaded", {}
                genai.configure(api_key=key)
                
                # Test against candidate flash models
                success_model = None
                output_text = None
                last_err = None
                for model_name in SUPPORTED_PROVIDERS["gemini"]["models"]:
                    try:
                        m = genai.GenerativeModel(model_name)
                        resp = m.generate_content(test_prompt, request_options={"timeout": 6.0})
                        if resp and resp.text:
                            success_model = model_name
                            output_text = resp.text.strip()
                            break
                    except Exception as me:
                        last_err = str(me)
                        if "429" in last_err or "quota" in last_err.lower():
                            return False, "Gemini API Quota Exceeded for this key (Rate limit / 429). Please try a key with available quota.", {}
                        continue

                if not success_model:
                    return False, f"Gemini key failed live verification: {last_err or 'No responsive model found'}", {}

                latency = round(time.time() - start_time, 2)
                return True, "Key verified and functional for text generation!", {
                    "provider": "gemini",
                    "provider_name": SUPPORTED_PROVIDERS["gemini"]["name"],
                    "model_tested": success_model,
                    "latency_sec": latency,
                    "sample_output": output_text
                }

            elif prov == "anthropic":
                endpoint = "https://api.anthropic.com/v1/messages"
                model_to_test = model or SUPPORTED_PROVIDERS["anthropic"]["default_model"]
                payload = json.dumps({
                    "model": model_to_test,
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": test_prompt}]
                }).encode("utf-8")
                req = urllib.request.Request(
                    endpoint,
                    data=payload,
                    headers={
                        "x-api-key": key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                        "User-Agent": "AI-Student-Assistant/2.0"
                    }
                )
                with urllib.request.urlopen(req, timeout=8.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    output_text = data["content"][0]["text"].strip()
                    latency = round(time.time() - start_time, 2)
                    return True, "Anthropic Claude key verified and functional!", {
                        "provider": "anthropic",
                        "provider_name": SUPPORTED_PROVIDERS["anthropic"]["name"],
                        "model_tested": model_to_test,
                        "latency_sec": latency,
                        "sample_output": output_text
                    }

            elif prov == "groq":
                endpoint = "https://api.groq.com/openai/v1/chat/completions"
                model_to_test = model or SUPPORTED_PROVIDERS["groq"]["default_model"]
                payload = json.dumps({
                    "model": model_to_test,
                    "messages": [{"role": "user", "content": test_prompt}],
                    "max_tokens": 10,
                    "temperature": 0.1
                }).encode("utf-8")
                req = urllib.request.Request(
                    endpoint,
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "User-Agent": "AI-Student-Assistant/2.0"
                    }
                )
                with urllib.request.urlopen(req, timeout=6.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    output_text = data["choices"][0]["message"]["content"].strip()
                    latency = round(time.time() - start_time, 2)
                    return True, "Groq key verified and functional!", {
                        "provider": "groq",
                        "provider_name": SUPPORTED_PROVIDERS["groq"]["name"],
                        "model_tested": model_to_test,
                        "latency_sec": latency,
                        "sample_output": output_text
                    }

            elif prov == "openai":
                endpoint = "https://api.openai.com/v1/chat/completions"
                model_to_test = model or SUPPORTED_PROVIDERS["openai"]["default_model"]
                payload = json.dumps({
                    "model": model_to_test,
                    "messages": [{"role": "user", "content": test_prompt}],
                    "max_tokens": 10,
                    "temperature": 0.1
                }).encode("utf-8")
                req = urllib.request.Request(
                    endpoint,
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "User-Agent": "AI-Student-Assistant/2.0"
                    }
                )
                with urllib.request.urlopen(req, timeout=6.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    output_text = data["choices"][0]["message"]["content"].strip()
                    latency = round(time.time() - start_time, 2)
                    return True, "OpenAI key verified and functional!", {
                        "provider": "openai",
                        "provider_name": SUPPORTED_PROVIDERS["openai"]["name"],
                        "model_tested": model_to_test,
                        "latency_sec": latency,
                        "sample_output": output_text
                    }

            elif prov == "openrouter":
                endpoint = "https://openrouter.ai/api/v1/chat/completions"
                model_to_test = model or SUPPORTED_PROVIDERS["openrouter"]["default_model"]
                payload = json.dumps({
                    "model": model_to_test,
                    "messages": [{"role": "user", "content": test_prompt}],
                    "max_tokens": 10,
                    "temperature": 0.1
                }).encode("utf-8")
                req = urllib.request.Request(
                    endpoint,
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://ai-student-assistant.app",
                        "X-Title": "AI Student Assistant"
                    }
                )
                with urllib.request.urlopen(req, timeout=6.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    output_text = data["choices"][0]["message"]["content"].strip()
                    latency = round(time.time() - start_time, 2)
                    return True, "OpenRouter key verified and functional!", {
                        "provider": "openrouter",
                        "provider_name": SUPPORTED_PROVIDERS["openrouter"]["name"],
                        "model_tested": model_to_test,
                        "latency_sec": latency,
                        "sample_output": output_text
                    }

            elif prov == "custom":
                raw_base = (base_url or "https://api.deepseek.com/v1").strip().rstrip("/")
                endpoint = raw_base if raw_base.endswith("/chat/completions") else f"{raw_base}/chat/completions"
                model_to_test = (model or "deepseek-chat").strip()
                payload = json.dumps({
                    "model": model_to_test,
                    "messages": [{"role": "user", "content": test_prompt}],
                    "max_tokens": 10,
                    "temperature": 0.1
                }).encode("utf-8")
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "AI-Student-Assistant/2.0"
                }
                if key and key.lower() not in ["none", "dummy"]:
                    headers["Authorization"] = f"Bearer {key}"
                req = urllib.request.Request(endpoint, data=payload, headers=headers)
                with urllib.request.urlopen(req, timeout=8.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    output_text = data["choices"][0]["message"]["content"].strip()
                    latency = round(time.time() - start_time, 2)
                    return True, f"Custom API verified ({model_to_test})!", {
                        "provider": "custom",
                        "provider_name": "Custom Provider",
                        "model_tested": model_to_test,
                        "base_url": raw_base,
                        "latency_sec": latency,
                        "sample_output": output_text
                    }

        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")
            if he.code == 401 or he.code == 403:
                return False, f"Authentication Failed (HTTP {he.code}): Invalid or inactive API key.", {"details": err_body}
            elif he.code == 429:
                return False, "Rate Limit / Quota Exceeded (HTTP 429): Key has exhausted current quota.", {"details": err_body}
            return False, f"Provider rejected request (HTTP {he.code}): {err_body[:140]}", {}
        except Exception as e:
            return False, f"Connection or validation error: {str(e)}", {}

        return False, "Unknown provider validation error", {}

    def save_custom_key(
        self,
        provider: str,
        api_key: str,
        label: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        set_active: bool = True
    ) -> Dict[str, Any]:
        """Validates and persists a custom API key."""
        is_valid, msg, details = self.test_live_key(provider, api_key, base_url=base_url, model=model)
        if not is_valid:
            raise ValueError(msg)

        prov = provider.lower().strip()
        key_id = f"{prov}_{api_key[-6:]}" if len(api_key) >= 6 else f"{prov}_{int(time.time())}"
        tested_model = details.get("model_tested") or model or SUPPORTED_PROVIDERS[prov]["default_model"]
        custom_base = details.get("base_url") or base_url

        record = {
            "id": key_id,
            "provider": prov,
            "provider_name": SUPPORTED_PROVIDERS[prov]["name"],
            "label": label or f"My {SUPPORTED_PROVIDERS[prov]['name']} Key",
            "api_key": api_key.strip(),
            "masked_key": self.mask_key(api_key.strip()),
            "model": tested_model,
            "base_url": custom_base,
            "verified_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "latency_sec": details.get("latency_sec", 0.0)
        }

        self.keys_registry[key_id] = record
        if set_active or not self.active_key_id:
            self.active_key_id = key_id

        self._save_storage()
        return self.get_status()

    def set_active_key(self, key_id_or_system: str) -> Dict[str, Any]:
        """Switches the active provider: 'system_default' or a specific key_id."""
        if key_id_or_system == "system_default":
            self.active_key_id = None
        elif key_id_or_system in self.keys_registry:
            self.active_key_id = key_id_or_system
        else:
            raise ValueError(f"Key '{key_id_or_system}' not found in registry.")

        self._save_storage()
        return self.get_status()

    def delete_custom_key(self, key_id: str) -> Dict[str, Any]:
        """Deletes a custom key from registry."""
        if key_id in self.keys_registry:
            del self.keys_registry[key_id]
            if self.active_key_id == key_id:
                self.active_key_id = next(iter(self.keys_registry.keys())) if self.keys_registry else None
            self._save_storage()
        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        """Returns safe summary of all custom keys and active configuration."""
        keys_summary = []
        for k_id, rec in self.keys_registry.items():
            keys_summary.append({
                "id": k_id,
                "provider": rec["provider"],
                "provider_name": rec["provider_name"],
                "label": rec["label"],
                "masked_key": rec["masked_key"],
                "model": rec["model"],
                "base_url": rec.get("base_url"),
                "is_active": (self.active_key_id == k_id),
                "verified_at": rec.get("verified_at", "")
            })

        active_rec = self.keys_registry.get(self.active_key_id) if self.active_key_id else None

        return {
            "active_mode": "custom" if active_rec else "system_default",
            "active_provider": active_rec["provider"] if active_rec else "gemini",
            "active_provider_name": active_rec["provider_name"] if active_rec else "System Gemini (Pool)",
            "active_model": active_rec["model"] if active_rec else "gemini-3.1-flash-lite",
            "active_key_masked": active_rec["masked_key"] if active_rec else "System .env Pool",
            "supported_providers": {
                k: {
                    "name": v["name"],
                    "description": v["description"],
                    "example_prefix": v["example_prefix"],
                    "docs_url": v["docs_url"],
                    "default_model": v["default_model"]
                }
                for k, v in SUPPORTED_PROVIDERS.items()
            },
            "saved_keys": keys_summary
        }

    def generate_with_custom(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.2) -> Optional[str]:
        """
        Executes text generation using the currently active custom provider key.
        Returns None if system_default is active or if call fails.
        """
        if not self.active_key_id or self.active_key_id not in self.keys_registry:
            return None

        rec = self.keys_registry[self.active_key_id]
        prov = rec["provider"]
        key = rec["api_key"]
        model = rec.get("model", SUPPORTED_PROVIDERS.get(prov, {}).get("default_model", "gemini-3.1-flash-lite"))

        try:
            if prov == "gemini":
                if not genai:
                    return None
                genai.configure(api_key=key)
                m = genai.GenerativeModel(model)
                resp = m.generate_content(prompt, request_options={"timeout": 10.0})
                return resp.text.strip() if resp else None

            elif prov == "anthropic":
                endpoint = "https://api.anthropic.com/v1/messages"
                headers = {
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                    "User-Agent": "AI-Student-Assistant/2.0"
                }
                payload = json.dumps({
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens
                }).encode("utf-8")
                req = urllib.request.Request(endpoint, data=payload, headers=headers)
                with urllib.request.urlopen(req, timeout=12.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data["content"][0]["text"].strip()

            elif prov in ["groq", "openai", "openrouter"]:
                endpoint_map = {
                    "groq": "https://api.groq.com/openai/v1/chat/completions",
                    "openai": "https://api.openai.com/v1/chat/completions",
                    "openrouter": "https://openrouter.ai/api/v1/chat/completions"
                }
                endpoint = endpoint_map[prov]
                headers = {
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "User-Agent": "AI-Student-Assistant/2.0"
                }
                if prov == "openrouter":
                    headers["HTTP-Referer"] = "https://ai-student-assistant.app"

                payload = json.dumps({
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": temperature
                }).encode("utf-8")

                req = urllib.request.Request(endpoint, data=payload, headers=headers)
                with urllib.request.urlopen(req, timeout=10.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data["choices"][0]["message"]["content"].strip()

            elif prov == "custom":
                raw_base = (rec.get("base_url") or "https://api.deepseek.com/v1").strip().rstrip("/")
                endpoint = raw_base if raw_base.endswith("/chat/completions") else f"{raw_base}/chat/completions"
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "AI-Student-Assistant/2.0"
                }
                if key and key.lower() not in ["none", "dummy"]:
                    headers["Authorization"] = f"Bearer {key}"

                payload = json.dumps({
                    "model": model or "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": temperature
                }).encode("utf-8")

                req = urllib.request.Request(endpoint, data=payload, headers=headers)
                with urllib.request.urlopen(req, timeout=12.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data["choices"][0]["message"]["content"].strip()

        except Exception as e:
            print(f"[LLMProviderService] Execution failed on {prov} ({model}): {e}")
            return None

        return None
