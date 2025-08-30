from .templates import OPENPOSE_KEYPOINTS, KEYPOINT_COLORS, OPENPOSE_RELATIONS, RELATION_COLORS, RENDER_ORDER, R_HAND_LANDMARKS, L_HAND_LANDMARKS

from server import PromptServer
from aiohttp import web

import cv2
import json
import numpy as np
import torch

from PIL import Image
import base64
import io

from threading import Event

current_index = 0
truples = []
signal = -1
user_continue_event = Event()

EDGE_THICKNESS = 8
VERTEX_RADIUS = 12
VERTEX_THICKNESS = -1
MIN_CONFIDENCE = 0.05

# @PromptServer.instance.routes.post must be outside of node class, otherwise it is a class method and the route will not be registered this way.
'''
# route for lifting the block on backend after first-call signal.
'''
@PromptServer.instance.routes.post("/free-first-call")
async def free_first_call(request):
    user_continue_event.set()
    return web.json_response({"status": "ok"})

'''
# route for lifting the block on backend after send-next-image signal.
'''
@PromptServer.instance.routes.post("/free-send-next-image")
async def free_send_next_image(request):
    global truples
    global current_index
    global signal

    data = await request.json()
    signal = data["signal"]
    figures = data["figures"]

    truples[current_index] = ManualOpenposeNode.updateTruple(truples[current_index], figures)

    current_index += signal

    user_continue_event.set()
    return web.json_response({"status": "ok"})

@PromptServer.instance.routes.post("/cancel-process")
async def cancel_process(request):
    global truples
    global current_index
    global signal

    data = await request.json()
    signal = data["signal"]
    figures = data["figures"]

    truples[current_index] = ManualOpenposeNode.updateTruple(truples[current_index], figures)

    user_continue_event.set()
    return web.json_response({"status": "ok"})

class ManualOpenposeNode:
    @classmethod
    def INPUT_TYPES(cls):
        data_in = {
            "required": {
                "images": ("IMAGE", {"forceInputAsList": True}),
            }
        }

        return data_in

    RETURN_NAMES = ("ref_imgs", "op_imgs")
    RETURN_TYPES = ("IMAGE", "IMAGE")
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
        figure = OPENPOSE_KEYPOINTS.copy()

        for img in ref_imgs:
            pil_img = ManualOpenposeNode.tensorToPIL(img)
            truples.append([pil_img, [figure,], []])

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
    def renderKeypoint(op_img, figure, landmark, render_order):
        x, y = figure[landmark][0], figure[landmark][1]

        # If hand landmarks (other than the wrist) have been set, then make the wrist landmark blue to signify to ControlNet that hands are there.
        if landmark == "r_wrist":
            if bool(set(R_HAND_LANDMARKS) & set(render_order)):
                cv2.circle(op_img, (x, y), VERTEX_RADIUS, [0,0,255], VERTEX_THICKNESS)
            else:
                cv2.circle(op_img, (x, y), VERTEX_RADIUS, KEYPOINT_COLORS[landmark], VERTEX_THICKNESS)

        elif landmark == "l_wrist":
            if bool(set(L_HAND_LANDMARKS) & set(render_order)):
                cv2.circle(op_img, (x, y), VERTEX_RADIUS, [0,0,255], VERTEX_THICKNESS)
            else:
                cv2.circle(op_img, (x, y), VERTEX_RADIUS, KEYPOINT_COLORS[landmark], VERTEX_THICKNESS)
        
        else:
            cv2.circle(op_img, (x, y), VERTEX_RADIUS, KEYPOINT_COLORS[landmark], VERTEX_THICKNESS)

    '''
    # Creates and adds a corresponding pair of render data that is stripped of low confidence landmarks and subsequently relations that contain them.
    # Note: The approach here is unnecessarily extensive. Should have built a list of acceptable entries instead, but both works.
    # @param {int} width - The image's width of this truple.
    # @param {int} height - The image's height of this truple.
    # @param {list} truple - List consisting of image, figure data and as of yet empty render data.
    # @return {list} List of prepared render data.
    '''
    @staticmethod
    def prepareRenderPair(width, height, truple):
        toRemove = []

        # Go through all the figures that exist.
        for i in range(0, len(truple[1])):
            truple[2].append(RENDER_ORDER.copy())
            figure = truple[1][i]

            for landmark in figure:

                # If the landmark is outside of the image or has too low confidence then remove it from the render order.
                if figure[landmark][0] >= width or figure[landmark][1] >= height or figure[landmark][2] < MIN_CONFIDENCE:

                    # Record the index of all invalid entries.
                    for j in range(0, len(truple[2][i])):
                        if landmark in truple[2][i][j]:
                            toRemove.append(j)

            # Sort the indeces in descending order to pop them without shifting the index of the other invalid entries.
            toRemove = sorted(set(toRemove), reverse=True)
            for index in toRemove:
                truple[2][i].pop(index)
            toRemove = []
        
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
        op_img = np.zeros((height, width, 3), dtype=np.uint8)

        for i in range(0, len(truple[1])):
            for element in truple[2][i]:
                figure = truple[1][i]
                if "-" in element:
                    ManualOpenposeNode.renderRelation(op_img, figure, element)
                else:
                    ManualOpenposeNode.renderKeypoint(op_img, figure, element, truple[2][i])
        
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
            for i in range(len(truple[1])):
                truple[1][i] = ManualOpenposeNode.convertToJSON(truple[1][i])
        return truples

    '''
    # Converts all JSON strings of the list of figures into Python dictionaries.
    # @param {list} truples - List consisting of image, figure data and render data.
    # @return {Image} truples - Updated truples.
    '''
    @staticmethod
    def convertAllJSONToDict(truples):
        for truple in truples:
            for i in range(len(truple[1])):
                truple[1][i] = ManualOpenposeNode.convertToDict(truple[1][i])
        return truples

    '''
    # Converts a given Torch tensor image into PIL.
    # @param {Torch.tensor} img - A tensor representing a single image.
    # @return {PIL.Image} PIL image.
    '''
    @staticmethod
    def tensorToPIL(img):
        array = img * 255 # ComfyUI stores image pixel values as normalized float values, but PIL expects discrete values between 0 and 255.
        array = array.clamp(0, 255) # Cut off all values below the stated minimum or above the stated maximum.
        array = array.byte() # Convert the PyTorch tensor image whose elements are float32 to uint8.
        array = array.cpu() # Move tensor from GPU memory to CPU memory, as NumPy can't work with GPU tensors directly to convert them into a NumPy array.
        array = array.numpy() # Converts PyTorch tensor to NumPy ndarray.
        return Image.fromarray(array)

    '''
    # Converts NumPy array into Torch tensor.
    # @param {NumPy array} np_img - ndarray of the shape (H,W,3) and uint8 elements.
    # @return {Torch.tensor} Torch tensor of the shape [1,H,W,C] and normalized float32 elements.
    '''
    @staticmethod
    def NPtoTensor(np_img):
        tensor = torch.from_numpy(np_img) # Create PyTorch tensor from same memory. No copy is created.
        tensor = tensor.to(torch.float32) # Converts element's values to float32.
        tensor = tensor.div_(255.0) # Divide each element by 255 to normalize the values. The underscore signifies an in-place operation meaning no new tensor is created.
        tensor = tensor.unsqueeze(0)
        return tensor

    '''
    # Main function of the node that is called when the node is reached in ComfyUI.
    # Takes in a batch of images and allows to manually create Openpose images for each of them.
    # @param {IMAGE*} images - Batch of images the node received as input.
    '''
    # Forgetting self as first parameter makes the node not show up.
    def manual_openpose_main(self, images):

        global truples
        global current_index
        global signal
        global cancel
        buffer = io.BytesIO()
        op_imgs = []

        ManualOpenposeNode.initialize()

        # Initialize truples and then turn their figures into a JSON string to be sent.
        truples = ManualOpenposeNode.prepareTruples(truples, images)
        truples = ManualOpenposeNode.convertAllDictToJSON(truples)
        total_imgs = len(truples)

        PromptServer.instance.send_sync("first-call", {"total_number": total_imgs})
        user_continue_event.clear()
        user_continue_event.wait()

        while signal != 0:
            img = truples[current_index][0]
            # Clear buffer
            buffer.seek(0)
            buffer.truncate(0)
            img.save(buffer, format="PNG")
            encoded_img = base64.b64encode(buffer.getvalue()).decode("utf-8")
            
            PromptServer.instance.send_sync("send-next-image", {"image_base64": encoded_img, "sent_figures": truples[current_index][1]})
            user_continue_event.clear()
            user_continue_event.wait()

        truples = ManualOpenposeNode.convertAllJSONToDict(truples)

        for i in range(len(truples)):
            img_width, img_height = truples[i][0].size # PIL.Image dimensions is accessed with ".size".
            truples[i][2] = ManualOpenposeNode.prepareRenderPair(img_width, img_height, truples[i])
            np_img = ManualOpenposeNode.renderOpenposeImage(img_width, img_height, truples[i])
            op_imgs.append(ManualOpenposeNode.NPtoTensor(np_img))

        ref_imgs = [img.unsqueeze(0) for img in images]

        PromptServer.instance.send_sync("terminate-frontend", {})

        return (ref_imgs, op_imgs)
    
'''
Notes:
If the batch input is forced to be a list then the tensor that is an input is turned into a list of squeezed tensors ([B,H,W,C] -> [H,W,C]).
A batch as a multiple will be received all at once by the next node and a list as a multiple will have its elements received individually and sequantially.
INPUT_IS_LIST or forceInputAsList simply transforms a batch into a list and makes the input available as a list parameter.
'''