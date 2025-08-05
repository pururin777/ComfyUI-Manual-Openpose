from templates import OPENPOSE_KEYPOINTS, KEYPOINT_COLORS, OPENPOSE_RELATIONS, RELATION_COLORS, RENDER_ORDER

from server import PromptServer
from aiohttp import web

import cv2
import json
import numpy as np

from PIL import Image
import base64
import io

from threading import Event

current_index = 0
truples = []
signal = -1
user_continue_event = Event()

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

    '''
    # Initialize these global variables whenever manual_openpose_main is called.
    '''
    @staticmethod
    def initialize():
        # Must use keyword global first, otherwise asignment will be treated as local.
        global current_index
        global truples
        global signal
        current_index = 0
        truples = []
        signal = -1

    '''
    # Converts a Python dictionary into a JSON formatted string.
    # @param {dict} dict - Dictionary that describes an openpose figure.
    # @return {string} JSON string made out of dictionary.
    '''
    @staticmethod
    def convertToJSON(dict):
        return json.dumps(dict, indent=4)

    '''
    # Converts a JSON string into a Python dictionary. Relevant for when "Send All" signal is made from frontend.
    # @param {string} json_str - JSON string that describes an openpose figure.
    # @return {dict} Dictionary made out of a JSON string.
    '''
    @staticmethod
    def convertToDict(json_str):
        return json.loads(json_str)

    '''
    # Creates a list of lists (truple) which contain an image, figure dictionaries that describe openpose information
    # and their respective pair of rendering information that is set after the "Send All" signal from the frontend.
    # @param {list} truples - Empty list meant to contain truple data.
    # @param {Image} ref_imgs - JSON string that describes an openpose figure.
    # @return {list} truples - List that contains initialized truple data.
    '''
    @staticmethod
    def prepareTruples(truples, ref_imgs):
        figure = ManualOpenposeNode.convertToJSON(OPENPOSE_KEYPOINTS)

        for img in ref_imgs:
            truples.append([img, [figure,], []])

        return truples

    '''
    # Renders the edge of a figure given figure information.
    # @param {Image} op_img - Image that is rendered onto.
    # @param {dict} figure - Dictionary that describes an openpose figure.
    # @param {string} relation - String that references a specific landmarks relation.
    '''
    @staticmethod
    def renderRelation(op_img, figure, relation):
        x1, y1 = figure[OPENPOSE_RELATIONS[relation][0]][0], figure[OPENPOSE_RELATIONS[relation][0]][1]
        x2, y2 = figure[OPENPOSE_RELATIONS[relation][1]][0], figure[OPENPOSE_RELATIONS[relation][1]][1]
        cv2.line(op_img, (x1, y1), (x2, y2), RELATION_COLORS[relation], EDGE_THICKNESS)

    '''
    # Renders the vertex of a figure given figure information.
    # @param {Image} op_img - Image that is rendered onto.
    # @param {dict} figure - Dictionary that describes an openpose figure.
    # @param {string} landmark - String that references a specific openpose figure landmark.
    '''
    @staticmethod
    def renderKeypoint(op_img, figure, landmark):
        x, y = figure[landmark][0], figure[landmark][1]
        cv2.circle(op_img, (x, y), VERTEX_RADIUS, KEYPOINT_COLORS[landmark], VERTEX_THICKNESS)

    '''
    # Creates and adds a corresponding pair of render data that is stripped of low confidence landmarks and subsequently relations that contain them.
    # @param {int} width - The image's width of this truple.
    # @param {int} height - The image's height of this truple.
    # @param {list} truple - List consisting of image, figure data and as of yet empty render data.
    # @return {list} List of prepared render data.
    '''
    @staticmethod
    def prepareRenderPair(width, height, truple):
        # Go through all the figures that exist.
        for i in range(0, len(truple[1])-1):
            truple[2].append(RENDER_ORDER.copy())

            for key in truple[1][i]:
                # If the keypount is outside of the image or has too low confidence then remove it from the render order.
                if key[0] >= width or key[1] >= height or key[2] < MIN_CONFIDENCE:
                    # Go through render order and remove every entry of the figure in question with the useless keypoint or edge.
                    for entry in truple[2][i]:
                        if key in entry:
                            truple[2][i].remove(entry)
        
        return truple[2]

    '''
    # Create empty image and renders it based on truple information.
    # @param {int} width - The image's width of this truple.
    # @param {int} height - The image's height of this truple.
    # @param {list} truple - List consisting of image, figure data and render data.
    # @return {Image} op_img - Rendered openpose image.
    '''
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

    '''
    # Updates specific truple after frontend has sent a response.
    # @param {list} truple - List consisting of image, figure data and render data.
    # @param {list} figures - New figure data from frontend.
    # @return {Image} truple - Updated truple.
    '''
    @staticmethod
    def updateTruple(truple, figures):
        truple[1] = figures
        return truple

    '''
    # Converts all Python dictionaries of the list of figures into JSON strings.
    # @param {list} truples - List consisting of image, figure data and render data.
    # @return {Image} truples - Updated truples.
    '''
    @staticmethod
    def convertAllDictToJSON(truples):
        for truple in truples:
            for figure in truple[1]:
                figure = ManualOpenposeNode.convertToJSON(figure)
        return truples

    '''
    # Converts all JSON strings of the list of figures into Python dictionaries.
    # @param {list} truples - List consisting of image, figure data and render data.
    # @return {Image} truples - Updated truples.
    '''
    @staticmethod
    def convertAllJSONToDict(truples):
        for truple in truples:
            for figure in truple[1]:
                figure = ManualOpenposeNode.convertToDict(figure)
        return truples

    '''
    # route for lifting the block on backend.
    '''
    @PromptServer.instance.routes.post("/free-block")
    async def free_block(request):
        global truples
        global current_index
        global signal

        data = await request.json()
        signal = data["signal"]
        figures = data["figures"]

        newFigures = []
        for figure in figures:
            ManualOpenposeNode.convertToJSON(figure)
            newFigures.append(figure)
        truples[current_index] = ManualOpenposeNode.updateTruple(truples[current_index], newFigures)
        
        user_continue_event.set()
        return web.json_response({"status": "ok"})

    '''
    # Main function of the node that is called when the node is reached in ComfyUI.
    # Takes in a batch of images and allows to manually create Openpose images for each of them.
    # @param {IMAGE*} ref_imgs - Batch of images the node received as input.
    '''
    def manual_openpose_main(ref_imgs):
        global truples
        global current_index
        global signal
        buffer = io.BytesIO()
        op_imgs = []

        ManualOpenposeNode.initialize()

        # Initialize truples and then turn their figures into a JSON string to be sent.
        truples = ManualOpenposeNode.prepareTruples(truples, ref_imgs)
        truples = ManualOpenposeNode.convertAllDictToJSON(truples)

        total_imgs = len(truples)
        PromptServer.instance.send_sync("first-call", {"message": total_imgs})

        user_continue_event.clear()

        while signal != 0:
            img = truples[current_index][0]
            img.save(buffer, format="PNG")
            encoded_img = base64.b64encode(buffer.getvalue()).decode("utf-8")
            
            PromptServer.instance.send_sync("send-next-image", {"image_base64": encoded_img, "sent_figures": truples[current_index][1]})
            user_continue_event.wait()

            if signal == 1:
                current_index += signal
            elif signal == -1:
                current_index += signal

        truples = ManualOpenposeNode.convertAllJSONToDict(truples)

        for i in range(len(truples)-1):
            img_width = truples[i][0].getWidth() # Just a placeholder. Find the appropriate function.
            img_height = truples[i][0].getHeight() # Just a placeholder. Find the appropriate function.
            truples[2] = ManualOpenposeNode.prepareRenderPair(img_width, img_height, truples[i])
            op_imgs.append(ManualOpenposeNode.renderOpenposeImage(img_width, img_height, truples[i]))

        PromptServer.instance.send_sync("terminate-frontend")

        return (ref_imgs, op_imgs)