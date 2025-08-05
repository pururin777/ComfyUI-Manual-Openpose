try:
    from .manual_openpose_node import ManualOpenposeNode

    NODE_CLASS_MAPPINGS = {"Manual Openpose Node": ManualOpenposeNode}

    # Registering the JS files for the browser to be aware of.
    WEB_DIRECTORY = "./js"

    __all__ = ['NODE_CLASS_MAPPINGS', 'WEB_DIRECTORY']

except Exception as e:
    import traceback
    with open("/workspace/manual_openpose_import_error.log", "w") as f:
        f.write("=== Manual Openpose Node Import Error ===\n")
        traceback.print_exc(file=f)
    raise  # Optional: re-raise if you want ComfyUI to still halt