"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from datetime import datetime
from typing import List
import os
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}

# In-memory messaging database
# Structure: {activity_name: {user_email: [{"from": email, "to": email, "message": text, "timestamp": time, "activity": name}]}}
messages = {}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str):
    """Unregister a student from an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}


@app.post("/messages/send")
def send_message(sender: str, recipient: str, activity_name: str, message_text: str):
    """Send a message to another user about an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Create message object
    message = {
        "from": sender,
        "to": recipient,
        "activity": activity_name,
        "text": message_text,
        "timestamp": datetime.now().isoformat()
    }

    # Initialize messages for this activity if needed
    if activity_name not in messages:
        messages[activity_name] = {}

    # Create conversation key (sorted to ensure consistency)
    conversation_key = tuple(sorted([sender, recipient]))
    if str(conversation_key) not in messages[activity_name]:
        messages[activity_name][str(conversation_key)] = []

    # Add message
    messages[activity_name][str(conversation_key)].append(message)
    
    return {"message": "Message sent successfully", "timestamp": message["timestamp"]}


@app.get("/messages/{activity_name}")
def get_activity_messages(activity_name: str, user_email: str):
    """Get all messages for a user in a specific activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Validate user is in the activity
    if user_email not in activities[activity_name]["participants"]:
        raise HTTPException(
            status_code=403,
            detail="User is not signed up for this activity"
        )

    # Get all messages for this user and activity
    if activity_name not in messages:
        return {"messages": [], "activity": activity_name, "user": user_email}

    user_messages = []
    for conversation_key, conv_messages in messages[activity_name].items():
        for msg in conv_messages:
            if msg["from"] == user_email or msg["to"] == user_email:
                user_messages.append(msg)

    # Sort by timestamp
    user_messages.sort(key=lambda x: x["timestamp"])

    return {
        "messages": user_messages,
        "activity": activity_name,
        "user": user_email,
        "total_messages": len(user_messages)
    }


@app.get("/messages/{activity_name}/{recipient}")
def get_conversation(activity_name: str, user_email: str, recipient: str):
    """Get all messages between two users in a specific activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Validate user is in the activity
    if user_email not in activities[activity_name]["participants"]:
        raise HTTPException(
            status_code=403,
            detail="User is not signed up for this activity"
        )

    if activity_name not in messages:
        return {"messages": [], "activity": activity_name, "user": user_email, "recipient": recipient}

    # Find conversation between these two users
    conversation_key = str(tuple(sorted([user_email, recipient])))
    
    if conversation_key not in messages[activity_name]:
        return {"messages": [], "activity": activity_name, "user": user_email, "recipient": recipient}

    conversation_messages = messages[activity_name][conversation_key]

    return {
        "messages": conversation_messages,
        "activity": activity_name,
        "user": user_email,
        "recipient": recipient,
        "total_messages": len(conversation_messages)
    }
