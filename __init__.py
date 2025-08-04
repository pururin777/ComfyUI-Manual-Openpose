from .manual_openpose_node import ManualOpenposeNode

NODE_CLASS_MAPPINGS = {"Manual Openpose Node": ManualOpenposeNode}

# Registering the JS files for the browser to be aware of.
WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'WEB_DIRECTORY']

