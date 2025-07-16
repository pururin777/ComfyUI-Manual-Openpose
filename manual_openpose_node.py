import json
import cv2
import numpy as np
from template import OPENPOSE_KEYPOINTS, KEYPOINT_COLORS, OPENPOSE_RELATIONS, RELATION_COLORS

class ManualOpenposeNode:
    @classmethod
    def INPUT_TYPES(cls):
        data_in = {
            "required": {
                "image_batch": ("IMAGE", {"forceInputAsList": True}),
            }
        }

        return data_in
    
    RETURN_NAMES = ("ref_imgs", "op_imgs")
    RETURN_TYPES = ("IMAGE","IMAGE")
    OUTPUT_IS_LIST = (True,True)

    FUNCTION = "manual_openpose_main"

    CATEGORY = "Pururin777 Nodes"

    EDGE_THICKNESS = 2
    VERTEX_RADIUS = 4
    VERTEX_THICKNESS = -1

    @staticmethod
    def placeholder():
        pass

    def manual_openpose_main(ref_imgs):
        return (ref_imgs, op_imgs)