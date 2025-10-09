"""
预设模型配置文件
可以通过修改此文件来更改默认模型配置
"""
import os

# 预设模型配置
# 你可以直接修改这里的配置，或者通过环境变量覆盖

PRESET_MODELS = {
    "codegeex": {
        "name": "CodeGeex",
        "url": os.getenv("CODEGEEX_API_URL", "http://127.0.0.1:11551/v1/chat/completions"),
        "model": os.getenv("CODEGEEX_MODEL", "codegeex4-all-9b"),
        "key": os.getenv("CODEGEEX_API_KEY", "codegeex")
    },
    "glm": {
        "name": "GLM-4",
        "url": os.getenv("GLM_API_URL", "http://127.0.0.1:11553/v1/chat/completions"),
        "model": os.getenv("GLM_MODEL", "glm4_32B_chat"),
        "key": os.getenv("GLM_API_KEY", "glm432b")
    }
}

# 默认使用的模型类型（可通过环境变量 DEFAULT_MODEL_TYPE 覆盖）
DEFAULT_MODEL_TYPE = os.getenv("DEFAULT_MODEL_TYPE", "glm")
