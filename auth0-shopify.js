/**
 * Creates and executes Auth0 logic
 */
(async function auth0Shopify() {
    const curr = document.currentScript;
    const config = curr.dataset;
    const { clientId: clientId, domain } = config;
    const autoLogin = curr.hasAttribute("auto-login") && config.autoLogin !== "0";

    /**
     * Helper function to execute multipass, extracts the multipass token from the idToken
     * and crafts the multipass url, then invokes the URL
     */
    async function invokeMultipass() {
        const user = await auth0.getUser();
        const multipassToken = user["https://myshopify.com/multipass"];

        if (!multipassToken) {
            throw new Error(
                `Auth0 Shopify was not configured correctly, please ensure that you have the Action 'shopify-multipass' as a part of your post-login actions, and the CLIENT_ID in config matches the data-client-id (${clientId}).`
            );
        }

        // Invoke multipass
        const multipassUrl = `${window.origin}/account/login/multipass/${multipassToken}`;
        window.location = multipassUrl;
    }

    /**
     * Helper function to invoke on each page refresh
     */
    async function handleCallback() {
        const query = new URL(window.location).searchParams;

        // Are we in a callback? Handle it
        if (query.has("code")) {
            await auth0.handleRedirectCallback();
            invokeMultipass();
        }
    }

    async function handleLogout(e) {
        e.stopPropagation();
        e.preventDefault();
        // Logout of the app, Shopify uses cookies so this actually works D:
        await fetch("/account/logout");

        await auth0.logout({
            // Log-out of Shopify, alternatively we can send this as Auth0's return to
            returnTo: window.location.origin,
        });
    }
    function handleLogin(e) {
        alert("WUT?");
        console.log("CLICK");
        e.stopPropagation();
        e.preventDefault();
        login();
    }

    const auth0 = new window.auth0.Auth0Client({
        domain,
        clientId,
        authorizationParams: {
            redirect_uri: window.location.origin
        }
    });


    /* const auth0 = new window.auth0.WebAuth({
          domain,
          clientID: client_id || clientId,
          scope: "openid profile email",
          responseType: "code",
      }); */

    const login = async () => {
        const params = new URL(window.top.location).searchParams;
        const postRedirectUrl =
            params.get("checkout_url") || params.get("return_url");
        let redirectUri = window.location.origin; // This should be something nicer than the main page since it takes a few seconds to finish multipass, but needs to be on the callback list. Maybe make a callback page.

        await auth0.loginWithRedirect({
            redirectUri: redirectUri,
            shopifyReturnTo: postRedirectUrl,
        });
    };

    window.addEventListener("load", () => {
        const logoutButton = document.querySelector('a[href="/account/logout"]');
        const loginButton = document.querySelector('a[href="/account/login"]');

        if (logoutButton) {
            logoutButton.addEventListener("click", handleLogout, true);
        }

        if (loginButton) {
            loginButton.addEventListener("click", handleLogin, true);
        }
    });

    // Expose global
    window.loginWithAuth0 = login;

    // Check if we are already in callback, if so handle it.
    await handleCallback();

    if (/account\/login$/.test(window.location)) {
        login();
    }

    if (autoLogin && !__st.cid) {
        try {
            // If this succeeds we likely have a token
            console.log("Trying autologin");
            await auth0.getTokenSilently();
            invokeMultipass();
        } catch (e) {
            // Pass
        }
    }
})();
