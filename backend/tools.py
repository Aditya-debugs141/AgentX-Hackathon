def _format_response(success: bool, data: dict = None, message: str = None, error: str = None) -> dict:
    """Standardized tool response format for Hermes."""
    if success:
        return {
            "success": True,
            "data": data or {},
            "message": message or "Operation completed successfully."
        }
    else:
        return {
            "success": False,
            "error": error or "Operation failed."
        }


def get_student(student_id: str) -> dict:
    """Retrieves basic profile information for a student."""
    # Mock database lookup
    if student_id == "stu_123":
        return _format_response(True, data={"name": "Alice Smith", "major": "Computer Science", "year": 3, "cgpa": 8.7})
    return _format_response(False, error=f"Student {student_id} not found.")


def get_attendance(student_id: str) -> dict:
    """Retrieves attendance percentage for a student."""
    if student_id == "stu_123":
        return _format_response(True, data={"overall_attendance": 85.5, "eligible_for_exams": True})
    return _format_response(False, error=f"Student {student_id} not found.")


def placement_lookup(student_id: str, company: str = "Google") -> dict:
    """Checks if a student is eligible for a specific company's placement drive."""
    student_res = get_student(student_id)
    if not student_res["success"]:
        return student_res
    
    cgpa = student_res["data"].get("cgpa", 0)
    
    if company.lower() == "google" and cgpa >= 8.5:
        return _format_response(True, data={"eligible": True, "reason": "CGPA meets requirement (8.5+)"}, message=f"Student is eligible for {company}.")
    elif company.lower() == "google":
        return _format_response(False, error=f"Not eligible for {company}. Required CGPA is 8.5, but student has {cgpa}.")
    
    return _format_response(True, data={"eligible": True}, message=f"Student is eligible for {company}.")


def register_event(student_id: str, event_id: str) -> dict:
    """Registers a student for a campus event or workshop."""
    student_res = get_student(student_id)
    if not student_res["success"]:
        return student_res
        
    # Mock event registration
    return _format_response(True, data={"ticket_id": f"TKT-{event_id}-999"}, message=f"Registered for event {event_id} successfully.")


def calendar_add(student_id: str, event_title: str, time: str) -> dict:
    """Adds an event to the student's personal calendar."""
    # Mock calendar addition
    return _format_response(True, message=f"Added '{event_title}' at {time} to calendar.")
