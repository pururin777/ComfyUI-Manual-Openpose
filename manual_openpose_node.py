import cv2
import json
import numpy as np

from templates import OPENPOSE_KEYPOINTS, KEYPOINT_COLORS, OPENPOSE_RELATIONS, RELATION_COLORS, RENDER_ORDER

# Global variables
EDGE_THICKNESS = 2
VERTEX_RADIUS = 4
VERTEX_THICKNESS = -1
MIN_CONFIDENCE = 0.05

class ManualOpenposeNode:
    @classmethod
    def INPUT_TYPES(cls):
        data_in = {
            "required": {
                "image_batch": ("IMAGE*", {"forceInputAsList": True}),
            }
        }

        return data_in
    
    RETURN_NAMES = ("ref_imgs", "op_imgs")
    RETURN_TYPES = ("IMAGE*", "IMAGE*")
    OUTPUT_IS_LIST = (True, True)

    FUNCTION = "manual_openpose_main"

    CATEGORY = "Pururin777 Nodes"

    # Converts python format for openpsoe_data and render_order into .json files for transmission.
    @staticmethod
    def convertToJSON(dict):
        return json.dumps(dict, indent=4)

    # Converts .json to python format. Will be necessary once "Send All" has been clicked and confirmed.
    @staticmethod
    def convertToDict(json_file):
        return json.load(json_file)

    # Creates new list that contains lists of three elements: [image, openpose_data, render_order]
    @staticmethod
    def pairWithOpenposeAndRenderData(truples, ref_imgs):
        figure = ManualOpenposeNode.convertToJSON(OPENPOSE_KEYPOINTS)

        for img in ref_imgs:
            truples.append([img, [figure,], []])

        return truples

    # Renders a relation. Checks if both vertices have been rendered.
    @staticmethod
    def renderRelation(op_img, figure, relation):
        x1, y1 = figure[OPENPOSE_RELATIONS[relation][0]][0], figure[OPENPOSE_RELATIONS[relation][0]][1]
        x2, y2 = figure[OPENPOSE_RELATIONS[relation][1]][0], figure[OPENPOSE_RELATIONS[relation][1]][1]
        cv2.line(op_img, (x1, y1), (x2, y2), RELATION_COLORS[relation], EDGE_THICKNESS)

    # Renders a vertex. Dosn't render when c < 0.05 and if out of bounds.
    @staticmethod
    def renderKeypoint(op_img, figure, landmark):
        x, y = figure[landmark][0], figure[landmark][1]
        cv2.circle(op_img, (x, y), VERTEX_RADIUS, KEYPOINT_COLORS[landmark], VERTEX_THICKNESS)

    # Add a default render order list to be paired with its respective figure.
    @staticmethod
    def addRenderData(truple):
        for i in range(0, len(truple[1])-1):
            truple[2].append(RENDER_ORDER.copy())

        return truple[2]

    # Removes all graphical elements from the render order that shouldn't be rendered.
    @staticmethod
    def cleanUpRenderList(width, height, truple):
        # Go through all the figures that exist.
        for i in range(0, len(truple[1])-1):
            # For figure i, go through each keypoint.
            for key in truple[1][i]:
                # If the keypount is outside of the image or has too low confidence then remove it from the render order.
                if key[0] >= width or key[1] >= height or key[2] < MIN_CONFIDENCE:
                    # Go through render order and remove every entry of the figure in question with the useless keypoint or edge.
                    for entry in truple[2][i]:
                        if key in entry:
                            truple[2][i].remove(entry)
        
        return truple[2]

    # Creates an empty image and then renders each figure based on landmark and render information.
    @staticmethod
    def renderOpenposeImage(width, height, truple):
        op_img = np.zeros((width, height, 3), dtype=np.uint8)

        for i in range(0, len(truple[1])-1):
            for element in truple[2][i]:
                figure = truple[1][i]
                if "-" in element:
                    ManualOpenposeNode.renderRelation(op_img, figure, element)
                else:
                    ManualOpenposeNode.renderKeypoint(op_img, figure, element)
        
        return op_img

    # Updates truples in backend after frontend data has been received.
    @staticmethod
    def updateTruples(index, truples, figures):
        truples[index][1] = figures
        return truples

    @staticmethod
    def convertAllDictToJSON(truples):
        for truple in truples:
            for figure in truple[1]:
                figure = ManualOpenposeNode.convertToJSON(figure)
        return truples

    # Converts all keypoint data in each truple from JSON to Python dict.s
    @staticmethod
    def convertAllJSONToDict(truples):
        for truple in truples:
            for figure in truple[1]:
                figure = ManualOpenposeNode.convertToDict(figure)
        return truples

    # The main function of the node that coordinates the other functions and will return a batch of reference images and a batch of openpose images as the node's output.
    def manual_openpose_main(ref_imgs):
        # Prepare the lists that you will need.
        current_index = 0
        truples = []
        op_imgs = []

        # Initialize truples and then turn their figures into a JSON string to be sent.
        truples = ManualOpenposeNode.pairWithOpenposeAndRenderData(truples, ref_imgs)
        truples = ManualOpenposeNode.convertAllDictToJSON(truples)

        '''
        # Send total amount of images once.
        total_imgs = len(truples)
        sendToFrontend(total_imgs)

        # This should be a do-while loop
        sendToFrontend(truples[current_index])

        figures, new_index = receiveFromFrontend()
        truples = ManualOpenposeNode.updateTruples(current_index, truples, figures)
        current_index = new_index
        '''

        # When "Send All" is received the code that updates truples must be run a last time.

        truples = ManualOpenposeNode.convertAllJSONToDict(truples)

        for i in range(len(truples)-1):
            img_width = truples[i][0].getWidth() # Just a placeholder. Find the appropriate function.
            img_height = truples[i][0].getHeight() # Just a placeholder. Find the appropriate function.
            truples[2] = ManualOpenposeNode.addRenderData(truples[i])
            truples[2] = ManualOpenposeNode.cleanUpRenderList(img_width, img_height, truples[i])
            op_imgs.append(ManualOpenposeNode.renderOpenposeImage(img_width, img_height, truples[i]))

        return (ref_imgs, op_imgs)