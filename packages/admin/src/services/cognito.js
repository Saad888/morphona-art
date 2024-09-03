import { CognitoUserPool, AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'us-west-2_HXZqyoWJi', // Your User Pool ID
  ClientId: 'ucqrprceub4br8i32s2tfi54d', // Your App Client ID
};

const userPool = new CognitoUserPool(poolData);

export const login = (username, password, onSuccess, onFailure) => {
  const authenticationDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });
  const userData = {
    Username: username,
    Pool: userPool,
  };
  const cognitoUser = new CognitoUser(userData);
  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess, onFailure, newPasswordRequired: () => {onFailure({message: "New Password Required, make Saad do this"})}
  });
}

export const logout = (onLogout) => {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut(); 
    onLogout(); 
  }
}

export const isUserAuthenticated = () => {
    const user = userPool.getCurrentUser();

    if (user) {
      user.getSession((err, session) => {
        if (err || !session.isValid()) {
          return false
        } else {
          return true
        }
      });
    } else {
      return false
    }
}
