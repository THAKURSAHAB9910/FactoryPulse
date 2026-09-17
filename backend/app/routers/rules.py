"""
Alert Rules Management Router
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.alert_rule import AlertRule
from ..schemas.alert_rule import AlertRuleCreate, AlertRuleUpdate, AlertRuleResponse
from ..models.user import User, UserRole
from ..utils.security import get_current_user, require_roles

router = APIRouter(prefix="/rules", tags=["Alert Rules"])

@router.get("", response_model=List[AlertRuleResponse])
def list_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AlertRule).order_by(AlertRule.rule_name).all()

@router.post("", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(
    rule_in: AlertRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ENGINEER]))
):
    rule = AlertRule(**rule_in.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.put("/{rule_id}", response_model=AlertRuleResponse)
def update_rule(
    rule_id: uuid.UUID,
    rule_in: AlertRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ENGINEER]))
):
    rule = db.query(AlertRule).filter(AlertRule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        
    for key, value in rule_in.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)
        
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(
    rule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    rule = db.query(AlertRule).filter(AlertRule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return None
