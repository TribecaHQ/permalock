//! Macros

/// Generates the signer seeds for a [crate::Permalock].
#[macro_export]
macro_rules! permalock_seeds {
    ($permalock: expr) => {
        &[&[
            b"Permalock" as &[u8],
            &$permalock.base.to_bytes(),
            &[$permalock.bump],
        ]]
    };
}
