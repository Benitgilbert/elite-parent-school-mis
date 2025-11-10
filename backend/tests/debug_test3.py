import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_debug_auth(async_client: AsyncClient, async_session: AsyncSession):
    """Debug test to see what's happening with auth"""
    from app.models import User, Role
    from app.auth_async import get_password_hash
    
    # Create roles
    admin_role = Role(name="admin")
    student_role = Role(name="student")
    teacher_role = Role(name="teacher")
    async_session.add_all([admin_role, student_role, teacher_role])
    await async_session.commit()
    await async_session.refresh(admin_role)
    
    # Create an admin user
    admin_user = User(
        email="admin@test.com",
        hashed_password=get_password_hash("admin"),
        full_name="Admin User",
        is_active=True,
    )
    admin_user.roles.append(admin_role)
    async_session.add(admin_user)
    await async_session.commit()
    
    print(f"Created admin user: {admin_user.email}")
    print(f"User roles: {[role.name for role in admin_user.roles]}")
    
    # Test login
    response = await async_client.post(
        "/auth/async/token",
        data={"username": "admin@test.com", "password": "admin"},
    )
    
    print(f"Login response status: {response.status_code}")
    print(f"Login response: {response.text}")
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"Token received: {token_data.get('access_token', 'No token')}")
        
        # Test the /me endpoint
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        me_response = await async_client.get("/auth/async/me", headers=headers)
        print(f"Me response status: {me_response.status_code}")
        print(f"Me response: {me_response.text}")
    
    assert response.status_code == 200