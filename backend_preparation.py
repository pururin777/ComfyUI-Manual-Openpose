import cv2
import glob
import json
import numpy as np
from PIL import Image

from template import OPENPOSE_KEYPOINTS, KEYPOINT_COLORS, OPENPOSE_RELATIONS, RELATION_COLORS, RENDER_ORDER

# Global variables
EDGE_THICKNESS = 2
VERTEX_RADIUS = 4
VERTEX_THICKNESS = -1
MIN_CONFIDENCE = 0.05

# Converts python format for openpsoe_data and render_order into .json files for transmission.
def convertToJSON(dict):
    return json.dumps(dict, indent=4)

# Converts .json to python format. Will be necessary once "Send All" has been clicked and confirmed.
def convertToDict(json_file):
    return json.load(json_file)

# Creates new list that contains lists of three elements: [image, openpose_data, render_order]
def pairWithOpenposeAndRenderData(truples, ref_imgs):
    keypoints_json = convertToJSON(OPENPOSE_KEYPOINTS)

    for img in ref_imgs:
        truples.append([img,[keypoints_json,],RENDER_ORDER])

    return truples

# Renders a relation. Checks if both vertices have been rendered.
def renderRelation(op_img, relation):
    x1, y1 = OPENPOSE_KEYPOINTS[OPENPOSE_RELATIONS[relation][0]][0], OPENPOSE_KEYPOINTS[OPENPOSE_RELATIONS[relation][0]][1]
    x2, y2 = OPENPOSE_KEYPOINTS[OPENPOSE_RELATIONS[relation][1]][0], OPENPOSE_KEYPOINTS[OPENPOSE_RELATIONS[relation][1]][1]
    cv2.line(op_img, (x1, y1), (x2, y2), RELATION_COLORS[relation], EDGE_THICKNESS)

# Renders a vertex. Dosn't render when c < 0.05 and if out of bounds.
def renderKeypoint(op_img, landmark):
    x, y = OPENPOSE_KEYPOINTS[landmark][0], OPENPOSE_KEYPOINTS[landmark][1]
    cv2.circle(op_img, (x, y), VERTEX_RADIUS, KEYPOINT_COLORS[landmark], VERTEX_THICKNESS)

# Removes all graphical elements from the render order that shouldn't be rendered.
def cleanUpRenderList(width, height, truple):
    # Go through all the figures that exist.
    for i in range(0, len(truple[1])):
        # For figure i, go through each keypoint.
        for key in truple[1][i]:
            # If the keypount is outside of the image or has too low confidence then remove it from the render order.
            if key[0] >= width or key[1] >= height or key[2] < MIN_CONFIDENCE:
                # Go through render order and remove every entry of the figure in question with the useless keypoint.
                for entry in truple[2]:
                    if entry[0] == i and key in entry[1]:
                        truple[2].remove(entry)
    
    return truple[2]

# Goes through the render order and renders all figures based on openpose_data.
def renderOpenposeImage(width, height, truple):
    op_img = np.zeros((width, height, 3), dtype=np.uint8)
    render_order = truple[2]
    
    for entry in render_order:
        if "-" in entry:
            renderRelation(op_img, entry[1])
        else:
            renderKeypoint(op_img, entry[1])
    
    return op_img

# Updates truples in backend after frontend data has been received.
def updateTruples(index, truples, figures, render_order):
    truples[index][1], truples[index][2] = figures, render_order
    return truples

# Converts all keypoint data in each truple from JSON to Python dict.
def convertAllJSONToDict(truples):
    for truple in truples:
        for figure in truple[1]:
            figure = convertToDict(figure)
    return truples

# The main function of the node that coordinates the other functions and will return a batch of reference images and a batch of openpose images as the node's output.
def manualOpenposeMain(ref_imgs):
    # Prepare the lists that you will need.
    current_index = 0
    truples = []
    op_images = []

    pairWithOpenposeAndRenderData(truples, ref_imgs)
    total_imgs = len(truples)

    # This should be a do-while loop
    sendToFrontend(truples[current_index], current_index, total_imgs)

    figures, render_order, new_index = receiveFromFrontend()
    truples = updateTruples(current_index, truples, figures, render_order)
    current_index = new_index
    #

    # When "Send All" is received the code that updates truples must be run a last time.

    truples = convertAllJSONToDict(truples)

    for i in len(truples):
        img_width = truples[i][0].getWidth() # Just a placeholder. Find the appropriate function.
        img_height = truples[i][0].getHeight() # Just a placeholder. Find the appropriate function.s
        truples[2] = cleanUpRenderList(img_width, img_height, truples[i])
        op_images.append(renderOpenposeImage(img_width, img_height, truples[i]))

    return (ref_imgs, op_images)