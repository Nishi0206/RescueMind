from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)
CORS(app)


# =========================================================
# MYSQL DATABASE CONNECTION
# =========================================================

try:

    db = mysql.connector.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME")
)

    cursor = db.cursor(dictionary=True)

    print("MySQL Connected Successfully")

except mysql.connector.Error as err:

    print("MySQL Connection Error:", err)

    db = None
    cursor = None


# =========================================================
# RESCUE TEAM DATA
# =========================================================

rescue_teams = [

    {
        "id": "TEAM-001",
        "name": "Team Alpha",
        "type": "Rapid Response",
        "members": 6,
        "vehicle": "Rescue Van",
        "status": "Available",
        "location": "Chennai"
    },

    {
        "id": "TEAM-002",
        "name": "Team Bravo",
        "type": "Medical Response",
        "members": 5,
        "vehicle": "Ambulance",
        "status": "Available",
        "location": "Puducherry"
    },

    {
        "id": "TEAM-003",
        "name": "Team Charlie",
        "type": "Water Rescue",
        "members": 7,
        "vehicle": "Rescue Boat",
        "status": "On Mission",
        "location": "Cuddalore"
    },

    {
        "id": "TEAM-004",
        "name": "Team Delta",
        "type": "Rapid Response",
        "members": 6,
        "vehicle": "Rescue Van",
        "status": "Available",
        "location": "Chengalpattu"
    }

]


# =========================================================
# SEVERITY CALCULATION
# =========================================================

def calculate_severity(emergency, people, description):

    score = 0

    emergency = str(emergency).strip().title()

    emergency_scores = {

        "Fire": 4,
        "Medical": 4,
        "Flood": 3,
        "Earthquake": 5,
        "Cyclone": 5,
        "Accident": 4,
        "Landslide": 5

    }

    score += emergency_scores.get(
        emergency,
        2
    )

    people = int(people)

    if people >= 10:

        score += 4

    elif people >= 5:

        score += 3

    elif people >= 3:

        score += 2

    else:

        score += 1

    description_lower = str(
        description
    ).lower()

    critical_words = [

        "trapped",
        "unconscious",
        "injured",
        "dying",
        "fire",
        "rising rapidly",
        "children",
        "bleeding",
        "drowning",
        "not breathing"

    ]

    for word in critical_words:

        if word in description_lower:

            score += 3

    if score >= 9:

        return "Critical"

    elif score >= 6:

        return "High"

    else:

        return "Medium"


# =========================================================
# AI PRIORITY ENGINE
# =========================================================

def calculate_ai_priority(emergency_request):

    score = 0

    reasons = []

    emergency = str(
        emergency_request.get(
            "emergency",
            ""
        )
    ).lower()

    description = str(
        emergency_request.get(
            "description",
            ""
        )
    ).lower()

    people = int(
        emergency_request.get(
            "people",
            0
        )
    )


    # -----------------------------------------------------
    # 1. PEOPLE AFFECTED
    # -----------------------------------------------------

    if people >= 10:

        score += 30

        reasons.append(
            "10 or more people affected"
        )

    elif people >= 5:

        score += 20

        reasons.append(
            "Multiple people affected"
        )

    elif people >= 2:

        score += 10

        reasons.append(
            "More than one person affected"
        )

    else:

        score += 5

        reasons.append(
            "Individual affected"
        )


    # -----------------------------------------------------
    # 2. EMERGENCY TYPE
    # -----------------------------------------------------

    if emergency in [

        "medical",
        "fire",
        "earthquake"

    ]:

        score += 20

        reasons.append(
            f"High-risk emergency type: "
            f"{emergency.title()}"
        )

    elif emergency in [

        "flood",
        "cyclone",
        "landslide"

    ]:

        score += 15

        reasons.append(
            f"Disaster emergency: "
            f"{emergency.title()}"
        )

    elif emergency == "accident":

        score += 15

        reasons.append(
            "Accident requires rapid assessment"
        )


    # -----------------------------------------------------
    # 3. CRITICAL KEYWORDS
    # -----------------------------------------------------

    critical_keywords = [

        "trapped",
        "unconscious",
        "bleeding",
        "collapsed",
        "drowning",
        "not breathing",
        "life threatening",
        "severe",
        "dying"

    ]

    found_critical = []

    for word in critical_keywords:

        if word in description:

            found_critical.append(word)

    if found_critical:

        score += 25

        reasons.append(
            "Critical condition detected: "
            + ", ".join(found_critical)
        )


    # -----------------------------------------------------
    # 4. URGENT KEYWORDS
    # -----------------------------------------------------

    urgent_keywords = [

        "urgent",
        "immediate",
        "rapidly",
        "rising rapidly",
        "getting worse",
        "spreading",
        "increasing"

    ]

    found_urgent = []

    for word in urgent_keywords:

        if word in description:

            found_urgent.append(word)

    if found_urgent:

        score += 15

        reasons.append(
            "Urgent or rapidly worsening "
            "situation detected"
        )


    # -----------------------------------------------------
    # LIMIT SCORE
    # -----------------------------------------------------

    score = min(
        score,
        100
    )


    # -----------------------------------------------------
    # PRIORITY LEVEL
    # -----------------------------------------------------

    if score >= 70:

        priority = "Critical"

        recommendation = (
            "Immediate response recommended"
        )

    elif score >= 45:

        priority = "High"

        recommendation = (
            "Dispatch rescue team soon"
        )

    elif score >= 25:

        priority = "Medium"

        recommendation = (
            "Monitor and respond"
        )

    else:

        priority = "Low"

        recommendation = (
            "Monitor situation"
        )


    return {

        "score": score,

        "priority": priority,

        "recommendation": recommendation,

        "reasons": reasons

    }


# =========================================================
# HOME / HEALTH CHECK
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({

        "message":
        "RescueMind API is running successfully",

        "status":
        "online"

    })


# =========================================================
# GET ALL EMERGENCY REQUESTS FROM MYSQL
# =========================================================

@app.route(
    "/api/requests",
    methods=["GET"]
)
def get_requests():

    if db is None or cursor is None:

        return jsonify({

            "error":
            "Database connection unavailable"

        }), 500

    try:

        cursor.execute("""

            SELECT

                request_id AS id,

                name,

                location,

                emergency,

                severity,

                people,

                status,

                description,

                created_at

            FROM emergency_requests

            ORDER BY created_at DESC

        """)

        requests = cursor.fetchall()

        return jsonify(requests)

    except mysql.connector.Error as err:

        return jsonify({

            "error":
            str(err)

        }), 500


# =========================================================
# CREATE NEW EMERGENCY REQUEST
# =========================================================

@app.route(
    "/api/requests",
    methods=["POST"]
)
def create_request():

    if db is None or cursor is None:

        return jsonify({

            "error":
            "Database connection unavailable"

        }), 500


    data = request.get_json()

    if not data:

        return jsonify({

            "error":
            "No data received"

        }), 400


    # -----------------------------------------------------
    # REQUIRED FIELDS
    # -----------------------------------------------------

    required_fields = [

        "name",
        "location",
        "emergency",
        "people"

    ]

    for field in required_fields:

        if field not in data:

            return jsonify({

                "error":
                f"Missing field: {field}"

            }), 400


    # -----------------------------------------------------
    # READ DATA
    # -----------------------------------------------------

    try:

        name = str(
            data["name"]
        ).strip()

        location = str(
            data["location"]
        ).strip()

        emergency = str(
            data["emergency"]
        ).strip()

        people = int(
            data["people"]
        )

        description = str(
            data.get(
                "description",
                ""
            )
        ).strip()

    except (
        ValueError,
        TypeError
    ):

        return jsonify({

            "error":
            "Invalid request data"

        }), 400


    # -----------------------------------------------------
    # VALIDATE PEOPLE
    # -----------------------------------------------------

    if people < 1:

        return jsonify({

            "error":
            "People affected must be at least 1"

        }), 400


    # -----------------------------------------------------
    # CALCULATE SEVERITY
    # -----------------------------------------------------

    severity = calculate_severity(

        emergency,
        people,
        description

    )


    # -----------------------------------------------------
    # GENERATE UNIQUE REQUEST ID
    # -----------------------------------------------------

    try:

        cursor.execute("""

            SELECT request_id

            FROM emergency_requests

            ORDER BY id DESC

            LIMIT 1

        """)

        last_request = cursor.fetchone()


        if last_request:

            last_id = last_request["request_id"]

            try:

                last_number = int(
                    last_id.split("-")[1]
                )

            except (
                ValueError,
                IndexError
            ):

                last_number = 0

        else:

            last_number = 0


        next_number = last_number + 1

        new_id = f"REQ-{next_number:03d}"


        # -------------------------------------------------
        # DOUBLE CHECK UNIQUE ID
        # -------------------------------------------------

        while True:

            cursor.execute("""

                SELECT id

                FROM emergency_requests

                WHERE request_id = %s

            """, (
                new_id,
            ))

            existing = cursor.fetchone()

            if not existing:

                break

            next_number += 1

            new_id = f"REQ-{next_number:03d}"


        # -------------------------------------------------
        # CREATED TIME
        # -------------------------------------------------

        created_at = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )


        # -------------------------------------------------
        # INSERT INTO MYSQL
        # -------------------------------------------------

        cursor.execute("""

            INSERT INTO emergency_requests

            (
                request_id,
                name,
                location,
                emergency,
                severity,
                people,
                status,
                description,
                created_at
            )

            VALUES

            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )

        """, (

            new_id,

            name,

            location,

            emergency,

            severity,

            people,

            "Pending",

            description,

            created_at

        ))


        db.commit()


        # -------------------------------------------------
        # RESPONSE OBJECT
        # -------------------------------------------------

        new_request = {

            "id":
            new_id,

            "name":
            name,

            "location":
            location,

            "emergency":
            emergency,

            "severity":
            severity,

            "people":
            people,

            "status":
            "Pending",

            "description":
            description,

            "created_at":
            created_at

        }


        return jsonify({

            "message":
            "Emergency request created successfully",

            "request":
            new_request

        }), 201


    except mysql.connector.Error as err:

        db.rollback()

        return jsonify({

            "error":
            f"MySQL error: {err}"

        }), 500


# =========================================================
# AI ANALYSIS
# =========================================================

@app.route(
    "/api/requests/<request_id>/ai-analysis",
    methods=["GET"]
)
def ai_analysis(request_id):

    if db is None or cursor is None:

        return jsonify({

            "error":
            "Database connection unavailable"

        }), 500


    try:

        # -------------------------------------------------
        # GET REQUEST FROM MYSQL
        # -------------------------------------------------

        cursor.execute("""

            SELECT

                request_id AS id,

                name,

                location,

                emergency,

                severity,

                people,

                status,

                description,

                created_at

            FROM emergency_requests

            WHERE request_id = %s

        """, (
            request_id,
        ))


        emergency_request = cursor.fetchone()


        # -------------------------------------------------
        # REQUEST NOT FOUND
        # -------------------------------------------------

        if emergency_request is None:

            return jsonify({

                "error":
                "Request not found"

            }), 404


        # -------------------------------------------------
        # RUN AI PRIORITY
        # -------------------------------------------------

        analysis = calculate_ai_priority(
            emergency_request
        )


        # -------------------------------------------------
        # RETURN RESULT
        # -------------------------------------------------

        return jsonify({

            "request_id":
            request_id,

            "emergency":
            emergency_request["emergency"],

            "location":
            emergency_request["location"],

            "analysis":
            analysis

        }), 200


    except mysql.connector.Error as err:

        return jsonify({

            "error":
            str(err)

        }), 500


# =========================================================
# ASSIGN RESCUE TEAM
# =========================================================

@app.route(
    "/api/requests/<request_id>/assign",
    methods=["PUT"]
)
def assign_request(request_id):

    if db is None or cursor is None:

        return jsonify({

            "error":
            "Database connection unavailable"

        }), 500


    data = request.get_json() or {}

    team_id = data.get(
        "team_id"
    )


    # -----------------------------------------------------
    # CHECK TEAM ID
    # -----------------------------------------------------

    if not team_id:

        return jsonify({

            "error":
            "Team ID is required"

        }), 400


    try:

        # -------------------------------------------------
        # FIND REQUEST
        # -------------------------------------------------

        cursor.execute("""

            SELECT

                request_id AS id,

                name,

                location,

                emergency,

                severity,

                people,

                status,

                description,

                created_at

            FROM emergency_requests

            WHERE request_id = %s

        """, (
            request_id,
        ))


        selected_request = cursor.fetchone()


        if selected_request is None:

            return jsonify({

                "error":
                "Request not found"

            }), 404


        # -------------------------------------------------
        # CHECK ALREADY ASSIGNED
        # -------------------------------------------------

        if selected_request["status"] == "Rescue Assigned":

            return jsonify({

                "error":
                "A rescue team is already assigned"

            }), 400


        # -------------------------------------------------
        # FIND TEAM
        # -------------------------------------------------

        selected_team = None


        for team in rescue_teams:

            if str(
                team["id"]
            ) == str(team_id):

                selected_team = team

                break


        if selected_team is None:

            return jsonify({

                "error":
                "Rescue team not found"

            }), 404


        # -------------------------------------------------
        # CHECK TEAM AVAILABILITY
        # -------------------------------------------------

        if selected_team["status"] != "Available":

            return jsonify({

                "error":
                "Selected rescue team is not available"

            }), 400


        # -------------------------------------------------
        # UPDATE REQUEST STATUS
        # -------------------------------------------------

        cursor.execute("""

            UPDATE emergency_requests

            SET status = %s

            WHERE request_id = %s

        """, (

            "Rescue Assigned",

            request_id

        ))


        db.commit()


        # -------------------------------------------------
        # UPDATE TEAM MEMORY
        # -------------------------------------------------

        selected_team["status"] = "On Mission"


        selected_request["status"] = (
            "Rescue Assigned"
        )

        selected_request["team_id"] = (
            selected_team["id"]
        )

        selected_request["team_name"] = (
            selected_team["name"]
        )


        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return jsonify({

            "message":
            "Rescue team deployed successfully",

            "request":
            selected_request,

            "team":
            selected_team

        }), 200


    except mysql.connector.Error as err:

        db.rollback()

        return jsonify({

            "error":
            str(err)

        }), 500


# =========================================================
# DASHBOARD STATISTICS
# =========================================================

@app.route(
    "/api/stats",
    methods=["GET"]
)
def get_stats():

    if db is None or cursor is None:

        return jsonify({

            "error":
            "Database connection unavailable"

        }), 500


    try:

        # -------------------------------------------------
        # CRITICAL
        # -------------------------------------------------

        cursor.execute("""

            SELECT COUNT(*) AS total

            FROM emergency_requests

            WHERE severity = 'Critical'

        """)

        critical = cursor.fetchone()["total"]


        # -------------------------------------------------
        # HIGH
        # -------------------------------------------------

        cursor.execute("""

            SELECT COUNT(*) AS total

            FROM emergency_requests

            WHERE severity = 'High'

        """)

        high = cursor.fetchone()["total"]


        # -------------------------------------------------
        # PENDING
        # -------------------------------------------------

        cursor.execute("""

            SELECT COUNT(*) AS total

            FROM emergency_requests

            WHERE status = 'Pending'

        """)

        pending = cursor.fetchone()["total"]


        # -------------------------------------------------
        # RESCUE ASSIGNED
        # -------------------------------------------------

        cursor.execute("""

            SELECT COUNT(*) AS total

            FROM emergency_requests

            WHERE status = 'Rescue Assigned'

        """)

        rescued = cursor.fetchone()["total"]


        # -------------------------------------------------
        # PEOPLE AFFECTED
        # -------------------------------------------------

        cursor.execute("""

            SELECT

                COALESCE(
                    SUM(people),
                    0
                ) AS total

            FROM emergency_requests

        """)

        people_at_risk = cursor.fetchone()["total"]


        return jsonify({

            "critical":
            critical,

            "high":
            high,

            "pending":
            pending,

            "rescued":
            rescued,

            "people_at_risk":
            people_at_risk

        })


    except mysql.connector.Error as err:

        return jsonify({

            "error":
            str(err)

        }), 500


# =========================================================
# GET ALL RESCUE TEAMS
# =========================================================

@app.route(
    "/api/teams",
    methods=["GET"]
)
def get_teams():

    return jsonify(
        rescue_teams
    )


# =========================================================
# GET AVAILABLE RESCUE TEAMS
# =========================================================

@app.route(
    "/api/teams/available",
    methods=["GET"]
)
def get_available_teams():

    available_teams = [

        team

        for team in rescue_teams

        if team["status"] == "Available"

    ]

    return jsonify(
        available_teams
    )


# =========================================================
# RUN FLASK SERVER
# =========================================================

if __name__ == "__main__":

    app.run(

        host="127.0.0.1",

        port=5000,

        debug=True

    )